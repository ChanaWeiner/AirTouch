/* global chrome */
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function App() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState("Initializing AI...");
  const [lastGesture, setLastGesture] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const lastCommandTime = useRef(0);

  useEffect(() => {
    let recognizer;
    let intervalId;

    const startSystem = async () => {
      try {
        const wasmUrl = chrome.runtime.getURL("wasm/");
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });
        
        setStatus("Ready! Control YouTube 📺");
        setCameraActive(true);

        intervalId = setInterval(() => {
          if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;
            const nowInMs = Date.now();
            const results = recognizer.recognizeForVideo(video, nowInMs);

            if (results.gestures.length > 0) {
              const gesture = results.gestures[0][0].categoryName;
              const confidence = results.gestures[0][0].score;
              
              // בגרסת יד אחת - לא מעניין אותנו איזו יד זו
              setLastGesture(gesture);

              if (confidence > 0.6) {
                handleGestureControl(gesture);
              }
            } else {
               if (Date.now() - lastCommandTime.current > 2000) {
                   setLastGesture("None");
               }
            }
          }
        }, 150);

      } catch (error) {
        setStatus("Error: " + error.message);
      }
    };

    const handleGestureControl = (gesture) => {
      const now = Date.now();
      if (micActive) return;
      if (now - lastCommandTime.current < 800) return;

      let commandSent = false;

      switch (gesture) {
        case "Open_Palm": 
          setStatus("⏸️ Pausing");
          sendCommandToYouTube("pause");
          commandSent = true;
          break;
        
        case "Closed_Fist": 
          setStatus("▶️ Playing");
          sendCommandToYouTube("play");
          commandSent = true;
          break;

        case "Victory": 
          // לוגיקה מעגלית: לחיצה משנה מהירות
          setStatus("⚡ Cycling Speed...");
          sendCommandToYouTube("cycleSpeed"); 
          commandSent = true;
          break;

        case "Thumb_Up": 
          setStatus("⏭️ Seek +10s");
          sendCommandToYouTube("seek", 10);
          commandSent = true;
          break;

        case "Thumb_Down": 
          setStatus("⏮️ Seek -10s");
          sendCommandToYouTube("seek", -10);
          commandSent = true;
          break;

        case "ILoveYou": 
          // בגרסת יד אחת ויתרנו על החזרה אחורה (נדיר בשימוש)
          setStatus("⏭️ Next Video / Skip Ad");
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
        
        // כאן יכנס החיבור לבקנד בהמשך
        
        setTimeout(() => {
            setMicActive(false);
            setStatus("Ready");
        }, 3000);
      };

      recognition.onerror = (e) => {
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
                    
                    case 'cycleSpeed': 
                        // מנגנון החלפת מהירות בלולאה
                        if (video.playbackRate === 1) {
                            video.playbackRate = 1.5;
                            console.log("Speed: 1.5x");
                        } else if (video.playbackRate === 1.5) {
                            video.playbackRate = 2;
                            console.log("Speed: 2x");
                        } else {
                            video.playbackRate = 1;
                            console.log("Speed: Normal");
                        }
                        break;
                }
              },
              args: [command, value]
            }).catch(err => console.log("Injection Error:", err));
          }
        });
      }
    };

    startSystem();

    return () => {
      clearInterval(intervalId);
      if (recognizer) recognizer.close();
    };
  }, [micActive]);

  return (
    <div style={{ width: "350px", padding: "10px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2 style={{margin: "0 0 10px 0"}}>AirTouch Control ✋</h2>
      
      {cameraActive && (
        <div style={{position: "relative"}}>
            <Webcam
            ref={webcamRef}
            style={{
                width: "100%", height: "200px", borderRadius: "10px", objectFit: "cover", transform: "scaleX(-1)",
                opacity: micActive ? 0.5 : 1,
                border: micActive ? "3px solid red" : "none"
            }}
            />
            <div style={{
                position: "absolute", top: 10, left: 10, 
                background: "rgba(255,255,255,0.8)", color: "black", 
                padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold"
            }}>
                Detecting: {lastGesture}
            </div>

            <div style={{
                position: "absolute", bottom: 10, left: 10, right: 10, 
                background: "rgba(0,0,0,0.7)", color: "#00ff00", 
                padding: "5px", borderRadius: "5px", fontSize: "16px", fontWeight: "bold"
            }}>
                {status}
            </div>
        </div>
      )}
      
      {/* תפריט ההוראות - מעודכן לגרסת יד אחת */}
      <div style={{fontSize: "12px", color: "#555", marginTop: "10px", textAlign: "left", lineHeight: "1.6", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px"}}>
        <div style={{background: "#f0f0f0", padding: "2px 5px", borderRadius: "3px"}}>✋ <b>Palm:</b> Pause</div>
        <div style={{background: "#f0f0f0", padding: "2px 5px", borderRadius: "3px"}}>✊ <b>Fist:</b> Play</div>
        <div style={{background: "#f0f0f0", padding: "2px 5px", borderRadius: "3px"}}>👍 <b>Thumb:</b> +10s</div>
        <div style={{background: "#f0f0f0", padding: "2px 5px", borderRadius: "3px"}}>👎 <b>Thumb:</b> -10s</div>
        
        {/* עדכנתי את השורות האלו שיתאימו ללוגיקה */}
        <div style={{background: "#e3f2fd", padding: "2px 5px", borderRadius: "3px", gridColumn: "span 2", textAlign: "center"}}>
            🤟 <b>Rock:</b> Skip Ad / Next Video
        </div>
        <div style={{background: "#e3f2fd", padding: "2px 5px", borderRadius: "3px", gridColumn: "span 2", textAlign: "center"}}>
            ✌️ <b>V-Sign:</b> Cycle Speed (1x ⟳ 2x)
        </div>
        
        <div style={{background: "#fff3e0", padding: "2px 5px", borderRadius: "3px", gridColumn: "span 2", textAlign: "center"}}>
            ☝️ <b>Point:</b> Ask AI (Mic)
        </div>
      </div>
    </div>
  );
}