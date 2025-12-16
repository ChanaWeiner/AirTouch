import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function App() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState("Initializing AI...");
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    let recognizer;
    let intervalId;

    const startSystem = async () => {
      try {
        console.log("Starting MediaPipe setup...");
        
        // 1. הגדרת הנתיב לקבצים המקומיים
        const wasmUrl = chrome.runtime.getURL("wasm");
        console.log("Wasm URL:", wasmUrl); // נראה את זה בלוגים

        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        console.log("FilesetResolver loaded!");

        // 2. טעינת המודל
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });
        
        console.log("Recognizer loaded!");
        setStatus("Ready! Show hand ✋");
        setCameraActive(true); // רק עכשיו מפעילים מצלמה

        // 3. לולאת הזיהוי
        intervalId = setInterval(() => {
          if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;
            const nowInMs = Date.now();
            const results = recognizer.recognizeForVideo(video, nowInMs);

            if (results.gestures.length > 0) {
              const detectedName = results.gestures[0][0].categoryName;
              setStatus("Detected: " + detectedName);
              console.log(detectedName);
            } else {
              setStatus("No hand detected");
            }
          }
        }, 200);

      } catch (error) {
        console.error("CRITICAL ERROR:", error);
        setStatus("Error: " + error.message);
      }
    };

    startSystem();

    return () => {
      clearInterval(intervalId);
      if (recognizer) recognizer.close();
    };
  }, []);

  return (
    <div style={{ width: "350px", padding: "10px", textAlign: "center" }}>
      <h2>AirTouch Vision 👁️</h2>
      
      {/* מציגים מצלמה רק כשהמערכת מוכנה */}
      {cameraActive && (
        <Webcam
          ref={webcamRef}
          style={{
            width: "100%",
            height: "250px",
            borderRadius: "10px",
            objectFit: "cover"
          }}
        />
      )}

      {/* אזור סטטוס ושגיאות */}
      <div style={{ 
        marginTop: "10px", 
        padding: "10px", 
        backgroundColor: status.includes("Error") ? "#ffebee" : "#e3f2fd",
        color: status.includes("Error") ? "red" : "blue",
        borderRadius: "5px",
        fontWeight: "bold"
      }}>
        {status}
      </div>
    </div>
  );
}