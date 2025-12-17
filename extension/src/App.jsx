/* global chrome */
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function App() {
  const webcamRef = useRef(null);
  
  // ניהול מצבים
  const [appState, setAppState] = useState("loading"); 
  const [status, setStatus] = useState("System Paused ⏸️");
  const [lastGesture, setLastGesture] = useState("-");
  const [micActive, setMicActive] = useState(false);
  
  const lastCommandTime = useRef(0);
  const recognizerRef = useRef(null);
  const intervalRef = useRef(null);

  // --- אתחול אוטומטי ---
  useEffect(() => {
    const initSystem = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop());
        startMediaPipe();
      } catch (err) {
        console.log("Permissions missing:", err);
        setAppState("permission_needed");
        setStatus("Permissions Required");
      }
    };

    initSystem();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognizerRef.current) recognizerRef.current.close();
    };
  }, []);

  const openSetupTab = () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: "index.html" });
    }
  };

  const startMediaPipe = async () => {
    setStatus("Loading AI Model... 🧠");
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
      setStatus("Error: " + error.message);
    }
  };

  const startLoop = (recognizer) => {
    setAppState("running");
    setStatus("Active! Show Hand ✋");

    intervalRef.current = setInterval(() => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const nowInMs = Date.now();
        const results = recognizer.recognizeForVideo(video, nowInMs);

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
    if (micActive) return;
    if (now - lastCommandTime.current < 800) return;

    let commandSent = false;

    switch (gesture) {
      case "Open_Palm": 
        setStatus("⏸️ Paused");
        sendCommandToYouTube("pause");
        commandSent = true;
        break;
      
      case "Closed_Fist": 
        setStatus("▶️ Playing");
        sendCommandToYouTube("play");
        commandSent = true;
        break;

      case "Victory": 
        // --- השינוי: טוגל פשוט ---
        setStatus("⚡ Toggling Speed (1x ↔ 2x)");
        sendCommandToYouTube("toggleSpeed"); 
        commandSent = true;
        break;

      case "Thumb_Up": 
        setStatus("⏭️ +10 Seconds");
        sendCommandToYouTube("seek", 10);
        commandSent = true;
        break;

      case "Thumb_Down": 
        setStatus("⏮️ -10 Seconds");
        sendCommandToYouTube("seek", -10);
        commandSent = true;
        break;

      case "ILoveYou": 
        setStatus("⏭️ Next / Skip");
        sendCommandToYouTube("skip");
        commandSent = true;
        break;

      case "Pointing_Up": 
        activateVoiceMode();
        commandSent = true;
        break;

      default:
        break;
    }

    if (commandSent) {
      lastCommandTime.current = now;
    }
  };

  const activateVoiceMode = () => {
    if (micActive) return;
    setMicActive(true);
    setStatus("Listening... 🎤");
    sendCommandToYouTube("pause");

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'he-IL';
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setStatus("Asked: " + transcript);
      
      // TODO: Backend Connection
      console.log("User Question:", transcript);

      setTimeout(() => {
          setMicActive(false);
          setStatus("Active! Show Hand ✋");
      }, 3000);
    };

    recognition.onerror = () => {
      setMicActive(false);
      setStatus("Mic Error / Cancelled");
    };
  };

  const sendCommandToYouTube = (command, value = null) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (cmd, val) => {
              const video = document.querySelector('video');
              
              if (cmd === 'skip') {
                  const skipBtn = document.querySelector('.ytp-ad-skip-button') || document.querySelector('.ytp-ad-skip-button-modern');
                  if (skipBtn) { skipBtn.click(); return; }
                  const nextBtn = document.querySelector('.ytp-next-button');
                  if (nextBtn) { nextBtn.click(); return; }
                  return;
              }

              if (!video) return;

              switch (cmd) {
                  case 'play': video.play(); break;
                  case 'pause': video.pause(); break;
                  case 'seek': video.currentTime += val; break;
                  
                  // --- הלוגיקה החדשה והפשוטה ---
                  case 'toggleSpeed': 
                      if (video.playbackRate <= 1) {
                          video.playbackRate = 2; // עובר למהיר
                      } else {
                          video.playbackRate = 1; // חוזר לרגיל
                      }
                      break;
              }
            },
            args: [command, value]
          }).catch(err => console.log(err));
        }
      });
    }
  };

  // --- UI ---
  if (appState === "permission_needed") {
    return (
      <div style={{ width: "350px", padding: "20px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>AirTouch Setup 🛠️</h2>
        <p style={{color: "#666", fontSize: "14px"}}>Camera access is required.</p>
        <button 
            onClick={openSetupTab}
            style={{
                backgroundColor: "#2196F3", color: "white", padding: "10px 20px",
                border: "none", borderRadius: "5px", fontSize: "16px", cursor: "pointer", marginTop: "10px"
            }}
        >
            Allow Access
        </button>
      </div>
    );
  }

return (
    <div style={{ 
        width: "100%", 
        height: "100%", 
        padding: "10px", 
        boxSizing: "border-box", 
        textAlign: "center", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between" 
    }}>
      
      <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "5px"}}>
        <span style={{fontSize: "20px"}}>✈️</span>
        <h2 style={{margin: 0, color: "#333", fontSize: "18px"}}>AirTouch</h2>
      </div>

      <div style={{
          position: "relative", 
          flex: 1, // לוקח את כל המקום הפנוי
          minHeight: "200px",
          maxHeight: "220px",
          backgroundColor: "#000", 
          borderRadius: "12px", 
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
      }}>
        
        {appState === "loading" && <span style={{color: "white"}}>Starting Camera...</span>}
        {appState === "error" && <span style={{color: "red"}}>Error Loading AI</span>}

        {appState === "running" && (
            <>
                <Webcam
                    ref={webcamRef}
                    style={{
                        width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)",
                        opacity: micActive ? 0.6 : 1
                    }}
                />
                <div style={{
                    position: "absolute", top: 8, left: 8, 
                    background: "rgba(0,0,0,0.6)", color: "white", 
                    padding: "2px 6px", borderRadius: "4px", fontSize: "11px"
                }}>
                    👁️ {lastGesture}
                </div>
            </>
        )}
      </div>

      <div style={{
          backgroundColor: appState === "running" ? "#e8f5e9" : "#eee",
          color: appState === "running" ? "#2e7d32" : "#777",
          padding: "6px", borderRadius: "6px", fontWeight: "bold", 
          margin: "8px 0",
          border: appState === "running" ? "1px solid #c8e6c9" : "1px solid #ddd",
          fontSize: "13px"
      }}>
          {status}
      </div>

      <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", 
          fontSize: "12px", color: "#555", opacity: appState === "running" ? 1 : 0.5
      }}>
        <KeyItem icon="✋" label="Pause" />
        <KeyItem icon="✊" label="Play" />
        <KeyItem icon="👍" label="+10s" />
        <KeyItem icon="👎" label="-10s" />
        <KeyItem icon="🤟" label="Next / Skip" wide />
        <KeyItem icon="✌️" label="Speed (1x/2x)" wide />
        <KeyItem icon="☝️" label="Ask AI (Mic)" wide bg="#fff3e0" />
      </div>

    </div>
  );
}

function KeyItem({ icon, label, wide, bg }) {
    return (
        <div style={{
            backgroundColor: bg || "white", padding: "8px", borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            gridColumn: wide ? "span 2" : "span 1",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            border: "1px solid #eee"
        }}>
            <span style={{fontSize: "16px"}}>{icon}</span> 
            <span style={{fontWeight: "500"}}>{label}</span>
        </div>
    );
}