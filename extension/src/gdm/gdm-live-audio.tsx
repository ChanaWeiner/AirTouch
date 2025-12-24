/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
declare var chrome: any;
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { LitElement, css, html } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { createBlob, decode, decodeAudioData } from './utils';
import './visual-3d';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';

  private client: GoogleGenAI;
  private session: Session;
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({ sampleRate: 16000 });
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({ sampleRate: 24000 });
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  @property({ type: String }) token = '';
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  // --- השינוי העיקרי הוא כאן ב-Styles ---
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* זה מבטיח שהקנבס של הבועה ימלא את כל המסך */
    gdm-live-audio-visuals-3d {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* הסתרת אלמנטים פנימיים ישנים שלא צריך יותר */
    #status, .controls {
      display: none !important;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('token') && this.token) {
      this.initClient();
    }
  }

  constructor() {
    super();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    if (!this.token) return;

    this.initAudio();

    this.client = new GoogleGenAI({
      apiKey: this.token,
      apiVersion: 'v1alpha'
    });

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private async initSession() {
    const model = 'gemini-2.5-flash-native-audio-preview-12-2025';

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Opened');
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("📩 Message received from Gemini:", message);

            // חילוץ ה-toolCall לפי המבנה שראינו בלוג שלך
            const toolCall = (message as any).toolCall;

            if (toolCall && toolCall.functionCalls) {
              const call = toolCall.functionCalls.find((fc: any) => fc.name === 'jump_to_video_timestamp');

              if (call && call.args) {
                const seconds = Number(call.args.timestamp_seconds);
                console.log("🚀 AirTouch: Preparing to jump to:", seconds);

                // כאן אנחנו משתמשים בשיטה שעובדת לך טוב:
                if (typeof chrome !== "undefined" && chrome.tabs) {
                  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                      chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (targetSeconds) => {
                          const video = document.querySelector('video');
                          if (video) {
                            video.currentTime = targetSeconds;
                            console.log("✅ Jumped to " + targetSeconds + " inside YouTube tab");
                          }
                        },
                        args: [seconds] // העברת הפרמטר לפונקציה המוזרקת
                      });
                    }
                  });
                }
              }
            }

            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Close:' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Microphone access granted. Starting capture...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording || !this.session) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        this.session.sendRealtimeInput({ media: createBlob(pcmData) });
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Recording...');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopping recording...');

    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateStatus('Recording stopped.');
  }

  public async terminateSession() {
    console.log("Terminating session and cleaning up...");
    this.stopRecording();

    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      this.session = null;
    }

    this.sources.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    this.sources.clear();

    if (this.inputAudioContext.state !== 'closed') {
      await this.inputAudioContext.suspend();
    }

    this.updateStatus('Session Terminated');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.terminateSession();
  }

  private reset() {
    this.session?.close();
    this.initSession();
    this.updateStatus('Session cleared.');
  }

  // --- ה-Render החדש והנקי ---
  render() {
    return html`
      <div class="container">
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}>
        </gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}