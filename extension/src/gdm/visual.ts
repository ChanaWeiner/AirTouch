/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

@customElement('gdm-live-audio-visuals')
export class GdmLiveAudioVisuals extends LitElement {
  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;

  private _outputNode: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block; /* מונע פסים לבנים */
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // הוספתי האזנה לשינוי גודל חלון כדי לתקן רזולוציה בזמן אמת
    window.addEventListener('resize', this.handleResize.bind(this));
    this.visualize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  // פונקציה חדשה שמתאימה את הרזולוציה לגודל המסך
  private handleResize() {
    if (this.canvas) {
      this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    }
  }

  private visualize() {
    if (this.canvas && this.outputAnalyser) {
      const canvas = this.canvas;
      const canvasCtx = this.canvasCtx;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      // הפכתי את הרקע לשקוף כדי שיראו את הרקע היפה שעשינו ב-App.css
      // canvasCtx.fillStyle = '#1f2937'; 
      // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = WIDTH / this.outputAnalyser.data.length;
      let x = 0;

      const inputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
      inputGradient.addColorStop(1, '#D16BA5');
      inputGradient.addColorStop(0.5, '#E78686');
      inputGradient.addColorStop(0, '#FB5F5F');
      canvasCtx.fillStyle = inputGradient;

      this.inputAnalyser.update();

      for (let i = 0; i < this.inputAnalyser.data.length; i++) {
        const barHeight = this.inputAnalyser.data[i] * (HEIGHT / 255);
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth;
      }

      canvasCtx.globalCompositeOperation = 'lighter';

      const outputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
      outputGradient.addColorStop(1, '#3b82f6');
      outputGradient.addColorStop(0.5, '#10b981');
      outputGradient.addColorStop(0, '#ef4444');
      canvasCtx.fillStyle = outputGradient;

      x = 0;
      this.outputAnalyser.update();

      for (let i = 0; i < this.outputAnalyser.data.length; i++) {
        const barHeight = this.outputAnalyser.data[i] * (HEIGHT / 255);
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth;
      }
    }
    requestAnimationFrame(() => this.visualize());
  }

  // כאן נקרא לפונקציית שינוי הגודל בפעם הראשונה
  firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas');
    this.canvasCtx = this.canvas.getContext('2d');
    this.handleResize(); // הגדרת רזולוציה ראשונית
  }

  // הסרתי את ה-private
  render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals': GdmLiveAudioVisuals;
  }
}