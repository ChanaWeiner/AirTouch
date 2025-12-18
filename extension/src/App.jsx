/* global chrome */
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import "./App.css";

import Header from "./components/Header";
import Status from "./components/Status";
import Legend from "./components/Legend";
import PermissionScreen from "./components/PermissionScreen";
import { sendCommandToYouTube, getCurrentTabUrl } from "./utils/youtube";
import { askGemini } from "./utils/api"; // הייבוא החדש

export default function App() {
  const webcamRef = useRef(null);
  const isSetupTab = window.location.search.includes("setup=true");
  // --- Refs לניהול ה-Live Connection ---
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const isRecognitionActive = useRef(false);
  // State
  const [appState, setAppState] = useState("loading");
  const [statusText, setStatusText] = useState("System Paused ⏸️");
  const [lastGesture, setLastGesture] = useState("-");

  // מצבים מיוחדים למיקרופון
  const [micState, setMicState] = useState("idle"); // 'idle', 'listening', 'thinking'

  // Refs
  const lastCommandTime = useRef(0);
  const lastSpeedToggleTime = useRef(0); // נעילה מיוחדת למהירות
  const recognizerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isSetupTab) {
      setAppState("permission_needed");
      return;
    }
    const initSystem = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop());
        startMediaPipe();
      } catch (err) {
        setAppState("permission_needed");
      }
    };
    initSystem();
    return () => {
      stopLiveMode();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognizerRef.current) recognizerRef.current.close();
    };
  }, [isSetupTab]);

  const handlePermissionAction = async () => {
    if (isSetupTab) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop());
        window.close();
      } catch (err) {
        alert("Permission denied.");
      }
    } else {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: "index.html?setup=true" });
      }
    }
  };

  const startMediaPipe = async () => {
    setStatusText("Loading AI Model... 🧠");
    try {
      const wasmUrl = chrome.runtime.getURL("wasm/");
      const vision = await FilesetResolver.forVisionTasks(wasmUrl);

      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
      });

      recognizerRef.current = recognizer;
      startLoop(recognizer);

    } catch (error) {
      setAppState("error");
      setStatusText("Error: " + error.message);
    }
  };

  const startLoop = (recognizer) => {
    setAppState("running");
    setStatusText("Active! Show Hand ✋");

    intervalRef.current = setInterval(() => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const results = recognizer.recognizeForVideo(video, Date.now());

        if (results.gestures.length > 0) {
          const gesture = results.gestures[0][0].categoryName;
          const confidence = results.gestures[0][0].score;
          setLastGesture(gesture);

          if (confidence > 0.6) {
            handleGestureControl(gesture);
          }
        } else {
          if (Date.now() - lastCommandTime.current > 1500) setLastGesture("-");
        }
      }
    }, 150);
  };

  const handleGestureControl = (gesture) => {
    const now = Date.now();

    // אם המיקרופון עובד - מתעלמים מכל תנועה אחרת!
    if (micState !== "idle") return;

    // קירור כללי לפקודות רגילות (800ms)
    if (now - lastCommandTime.current < 800) return;

    let commandSent = false;

    switch (gesture) {
      case "Open_Palm":
        window.speechSynthesis.cancel(); // עוצר את הקול מיד
        if (micState !== "idle") {
          resetToIdle();
          return;
        }
        setStatusText("⏸️ Paused");
        sendCommandToYouTube("pause");
        commandSent = true;
        break;

      case "Closed_Fist":
        // if (isRecognitionActive.current) stopLiveMode();
        setStatusText("▶️ Playing");
        sendCommandToYouTube("play");
        commandSent = true;
        break;

      case "Victory":
        // --- תיקון לבעיית המהירות (Speed Toggle Fix) ---
        // אנחנו בודקים אם עברו 2 שניות (2000ms) מהשינוי האחרון
        if (now - lastSpeedToggleTime.current > 2000) {
          setStatusText("⚡ Toggling Speed...");
          sendCommandToYouTube("toggleSpeed");
          lastSpeedToggleTime.current = now; // עדכון זמן הנעילה
          commandSent = true;
        } else {
          // אם לא עבר זמן - אנחנו מתעלמים אבל מראים חיווי שהפקודה "נעולה"
          setStatusText("🔒 Speed Locked (Wait...)");
        }
        break;

      case "Thumb_Up":
        setStatusText("⏭️ +10 Seconds");
        sendCommandToYouTube("seek", 10);
        commandSent = true;
        break;

      case "Thumb_Down":
        setStatusText("⏮️ -10 Seconds");
        sendCommandToYouTube("seek", -10);
        commandSent = true;
        break;

      case "ILoveYou":
        setStatusText("⏭️ Next / Skip");
        sendCommandToYouTube("skip");
        commandSent = true;
        break;

      case "Pointing_Up":
        activateVoiceMode();
        break;

      default: break;
    }

    if (commandSent) lastCommandTime.current = now;
  };

  const float32ToInt16 = (buffer) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
  };

  const stopLiveMode = () => {
    if (processorRef.current) processorRef.current.disconnected();
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    if (socketRef.current) socketRef.current.close();

    isRecognitionActive.current = false;
    setMicState("idle");
    setStatusText("Active! Show Hand ✋");
  }

  const activateLiveVoiceMode = async () => {
    if (micState !== "idle" || isRecognitionActive.current) {
      return;
    }

    try {
      isRecognitionActive.current = true;
      setMicState("listening");
      setStatusText("🎙️ Connecting to Gemini Live...");
      sendCommandToYouTube("pause");
      socketRef.current = new WebSocket("ws://localhost:8000/ws/live");
      socketRef.current.onopen = async () => {
        setStatusText("🎙️ Live! Ask about the video...");
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
        processorRef.current.onaudioprocess = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = float32ToInt16(inputData);
            socketRef.current.send(pcmData);
          }
        }
      }

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "text") {
          setMicState("thinking");
          setStatusText("🧠 Thinking: " + data.content);
        }
      }

      socketRef.current.onclose = () => stopLiveMode();
      socketRef.current.onerror = () => stopLiveMode();
    } catch (err) {
      console.error("Live Mode Error:", err);
      stopLiveMode();
    }
  }


  // --- ניהול מיקרופון משופר ---
  // 1. הגדירי את המשתנה הזה מחוץ לפונקציה (ברמת הקובץ)
  const activateVoiceMode = () => {
    // 2. בדיקת בטיחות כפולה
    if (micState !== "idle" || isRecognitionActive.current) {
      console.log("Recognition busy...");
      return;
    }

    sendCommandToYouTube("pause");
    setMicState("listening");
    setStatusText("🎙️ Listening...");
    isRecognitionActive.current = true;

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'he-IL';

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;

      // ברגע שיש טקסט - עוצרים את המיקרופון ועוברים לחשוב
      recognition.stop();
      setMicState("thinking");
      setStatusText("🧠 Thinking: " + transcript); //נוסיף כאן סימן טעינה

      try {
        const video_url = await getCurrentTabUrl();
        const answer = await askGemini(video_url, transcript);
        setStatusText("🤖 AI: " + answer);
        console.log("AI Answer:", answer);

        // --- כאן מפעילים את ההקראה ---
        speakText(answer, () => {
          console.log("Speech finished, returning to idle...");
          resetToIdle();
        });
      } catch (err) {
        console.error("API Error:", err);
        setStatusText("❌ Error: Could not reach AI");
      } finally {

      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      setStatusText(`❌ Mic Error: ${event.error}`);

      // איפוס אוטומטי מהיר אחרי שגיאת מיקרופון (למשל אם לא שמעו כלום)
      setTimeout(() => {
        setMicState("idle");
        isRecognitionActive.current = false;
        setStatusText("Active! Show Hand ✋");
      }, 3000);
    };

    recognition.onend = () => {
      // אם הסתיים בלי תוצאה (למשל המשתמש שתק)
      if (micState === "listening") {
        isRecognitionActive.current = false;
        setMicState("idle");
        setStatusText("Active! Show Hand ✋");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Start Error:", e);
      isRecognitionActive.current = false;
      setMicState("idle");
    }
  };

  const speakText = (text, onFinished) => {
    // 1. זיהוי שפה אוטומטי (רג'קס שבודק אם יש תווים בעברית)
    const isHebrew = /[\u0590-\u05FF]/.test(text);
    const lang = isHebrew ? 'he' : 'en';

    // 2. ניקוי סימני Markdown של Gemini (כמו כוכביות)
    const cleanText = text.replace(/[*#]/g, "").trim();

    // 3. יצירת הכתובת לשרת
    const audioUrl = `http://localhost:8000/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
    const audio = new Audio(audioUrl);

    // 4. ניהול סיום ההקראה וחזרה ללופ
    audio.onended = () => {
      if (onFinished) onFinished();
    };

    audio.onerror = (e) => {
      console.error("TTS Error:", e);
      if (onFinished) onFinished();
    };

    // 5. ניגון
    audio.play().catch(err => {
      console.error("Audio play blocked:", err);
      if (onFinished) onFinished();
    });
  };

  const resetToIdle = () => {
    window.speechSynthesis.cancel(); // עצירת הקראה אם קיימת
    setMicState("idle");
    isRecognitionActive.current = false;
    setStatusText("Active! Show Hand ✋");
  };

  if (appState === "permission_needed") {
    return <PermissionScreen onAction={handlePermissionAction} isSetupTab={isSetupTab} />;
  }

  return (
    <div className="app-container">
      <Header />

      <div className="camera-wrapper">
        {appState === "loading" && <span style={{ color: "white" }}>Starting Camera...</span>}
        {appState === "error" && <span style={{ color: "red" }}>Error Loading AI</span>}
        {appState === "running" && (
          <>
            <Webcam
              ref={webcamRef}
              style={{
                width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)",
                opacity: micState !== "idle" ? 0.3 : 1, // עמעום כשהמיקרופון עובד
                transition: "opacity 0.5s"
              }}
            />

            {/* אייקון מיקרופון ענק כשאנחנו במצב האזנה */}
            {micState === "listening" && (
              <div style={{ position: "absolute", fontSize: "60px", animation: "pulse 1s infinite" }}>🎙️</div>
            )}
            {micState === "thinking" && (
              <div style={{ position: "absolute", fontSize: "60px", animation: "spin 1s infinite" }}>⏳</div>
            )}

            <div className="overlay-text">
              👁️ {lastGesture}
            </div>
          </>
        )}
      </div>

      <div style={{
        backgroundColor: micState !== "idle" ? "#e3f2fd" : (appState === "running" ? "#e8f5e9" : "#eee"),
        color: micState !== "idle" ? "#1565c0" : (appState === "running" ? "#2e7d32" : "#777"),

        // הגדרות למניעת גלילה חיצונית
        minHeight: "50px",
        maxHeight: "100px",      /* מגביל את גובה הטקסט כדי שלא ידחוף את הכפתורים החוצה */
        padding: "8px 12px",

        borderRadius: "10px",
        margin: "5px 0",         /* צמצום מרווחים */
        border: "1px solid #ddd",
        fontSize: "14px",
        lineHeight: "1.3",

        overflowY: "auto",       /* גלילה רק *בתוך* התיבה אם Gemini חופר במיוחד */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        direction: "rtl"
      }}>
        {statusText}
      </div>

      <Legend isActive={appState === "running" && micState === "idle"} />

    </div>
  );
}