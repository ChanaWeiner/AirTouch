/* global chrome */
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import "./App.css";

import Header from "./components/Header";
import Status from "./components/Status";
import Legend from "./components/Legend";
import PermissionScreen from "./components/PermissionScreen";
import { sendCommandToYouTube } from "./utils/youtube";
import { askGemini } from "./utils/api"; // הייבוא החדש

export default function App() {
  const webcamRef = useRef(null);
  const isSetupTab = window.location.search.includes("setup=true");

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
        setStatusText("⏸️ Paused");
        sendCommandToYouTube("pause");
        commandSent = true;
        break;
      
      case "Closed_Fist": 
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
        // לא מסמנים commandSent כדי לא להפעיל את הקירור הרגיל
        break;

      default: break;
    }

    if (commandSent) lastCommandTime.current = now;
  };

  // --- ניהול מיקרופון משופר ---
  const activateVoiceMode = () => {
    if (micState !== "idle") return; // מניעת הפעלה כפולה
    
    setMicState("listening");
    setStatusText("🎙️ Listening... Speak Now!");
    sendCommandToYouTube("pause"); // משתיק את הוידאו

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'he-IL'; // עברית
    recognition.start();

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      
      // שלב 1: זיהינו דיבור, עוברים למצב "חושב"
      setMicState("thinking");
      setStatusText("🧠 Thinking: " + transcript);
      
      // שלב 2: שליחה לשרת (Backend)
      const answer = await askGemini(transcript);
      
      // שלב 3: הצגת תשובה
      setStatusText("🤖 AI: " + answer);
      
      // חזרה לשגרה אחרי 5 שניות
      setTimeout(() => { 
          setMicState("idle"); 
          setStatusText("Active! Show Hand ✋"); 
      }, 5000);
    };

    recognition.onerror = () => {
      // אם הייתה שגיאה או שקט - פשוט חוזרים מיד לשגרה
      setMicState("idle");
      setStatusText("Mic Cancelled / No Sound");
    };

    recognition.onend = () => {
        // אם הדיבור נגמר ועדיין לא קיבלנו תוצאה (למשל שקט)
        if (micState === "listening") {
            setMicState("idle");
        }
    };
  };

  if (appState === "permission_needed") {
    return <PermissionScreen onAction={handlePermissionAction} isSetupTab={isSetupTab} />;
  }

  return (
    <div className="app-container">
      <Header />

      <div className="camera-wrapper">
        {appState === "loading" && <span style={{color: "white"}}>Starting Camera...</span>}
        {appState === "error" && <span style={{color: "red"}}>Error Loading AI</span>}
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
                    <div style={{position: "absolute", fontSize: "60px", animation: "pulse 1s infinite"}}>🎙️</div>
                )}
                {micState === "thinking" && (
                    <div style={{position: "absolute", fontSize: "60px", animation: "spin 1s infinite"}}>⏳</div>
                )}

                <div className="overlay-text">
                    👁️ {lastGesture}
                </div>
            </>
        )}
      </div>

      {/* הסטטוס מקבל צבע שונה אם אנחנו במצב מיקרופון */}
      <div style={{
          backgroundColor: micState !== "idle" ? "#e3f2fd" : (appState === "running" ? "#e8f5e9" : "#eee"),
          color: micState !== "idle" ? "#1565c0" : (appState === "running" ? "#2e7d32" : "#777"),
          padding: "6px", borderRadius: "6px", fontWeight: "bold", 
          margin: "8px 0",
          border: "1px solid #ddd",
          fontSize: "13px",
          minHeight: "20px"
      }}>
          {statusText}
      </div>
      
      <Legend isActive={appState === "running" && micState === "idle"} />

    </div>
  );
}