/* global chrome */ // שורה חשובה כדי שהעורך לא יצעק ש-chrome לא קיים
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function App() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState("Initializing AI...");
  const [cameraActive, setCameraActive] = useState(false);
  const lastGestureRef = useRef(null); // כדי לא לשלוח פקודות כפולות
  const lastCommandTime = useRef(0);   // "קירור" בין פקודות

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
        
        setStatus("Ready! Open Tab with YouTube");
        setCameraActive(true);

        intervalId = setInterval(() => {
          if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;
            const results = recognizer.recognizeForVideo(video, Date.now());

            if (results.gestures.length > 0) {
              const gesture = results.gestures[0][0].categoryName;
              const confidence = results.gestures[0][0].score;

              // מסננים זיהויים חלשים
              if (confidence > 0.6) {
                setStatus("Gesture: " + gesture);
                handleGestureControl(gesture);
              }
            } else {
              setStatus("Watching...");
              lastGestureRef.current = null;
            }
          }
        }, 200); // בדיקה 5 פעמים בשנייה

      } catch (error) {
        setStatus("Error: " + error.message);
      }
    };

    // הפונקציה ששולטת ביוטיוב
    const handleGestureControl = (gesture) => {
      const now = Date.now();
      // מנגנון השהייה: לא לשלוח פקודה יותר מפעם בשנייה
      if (now - lastCommandTime.current < 1000) return;

      if (gesture === "Open_Palm") {
        console.log("PAUSING VIDEO");
        executeScriptOnActiveTab(() => {
          const video = document.querySelector('video');
          if (video) video.pause();
        });
        lastCommandTime.current = now;
      } 
      else if (gesture === "Closed_Fist") {
        console.log("PLAYING VIDEO");
        executeScriptOnActiveTab(() => {
          const video = document.querySelector('video');
          if (video) video.play();
        });
        lastCommandTime.current = now;
      }
    };

    // פונקציית עזר להרצת קוד בדף הפעיל
    const executeScriptOnActiveTab = (func) => {
      // מוודאים שאנחנו רצים כתוסף כרום
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: func,
            }).catch(err => console.log("Cannot run script here:", err));
          }
        });
      }
    };

    startSystem();

    return () => {
      clearInterval(intervalId);
      if (recognizer) recognizer.close();
    };
  }, []);

  return (
    <div style={{ width: "350px", padding: "10px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2 style={{margin: "0 0 10px 0"}}>AirTouch Control ✋</h2>
      
      {cameraActive && (
        <div style={{position: "relative"}}>
            <Webcam
            ref={webcamRef}
            style={{
                width: "100%",
                height: "200px",
                borderRadius: "10px",
                objectFit: "cover",
                transform: "scaleX(-1)" // אפקט מראה (טבעי יותר)
            }}
            />
            <div style={{
                position: "absolute", bottom: 10, left: 10, right: 10, 
                background: "rgba(0,0,0,0.6)", color: "white", 
                padding: "5px", borderRadius: "5px"
            }}>
                {status}
            </div>
        </div>
      )}
      
      <p style={{fontSize: "12px", color: "#666"}}>
        Open Palm ✋ = Pause <br/>
        Closed Fist ✊ = Play
      </p>
    </div>
  );
}