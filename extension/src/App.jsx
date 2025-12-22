import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import Header from "./components/Header";
import Legend from "./components/Legend";
import PermissionScreen from "./components/PermissionScreen";
import { sendCommandToYouTube, getCurrentTabUrl } from "./utils/youtube";
import "./App.css";
import "./gdm/gdm-live-audio"

export default function App() {
  const webcamRef = useRef(null);
  const isSetupTab = window.location.search.includes("setup=true");

  const liveAudioRef = useRef(null);

  const [appState, setAppState] = useState("loading");
  const [statusText, setStatusText] = useState("System Paused ⏸️");
  const [lastGesture, setLastGesture] = useState("-");
  const [isAiActive, setIsAiActive] = useState(false);
  const isAiActiveRef = useRef(false);
  const [sessionToken, setSessionToken] = useState(null);
  const lastCommandTime = useRef(0);
  const lastSpeedToggleTime = useRef(0);
  const recognizerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    isAiActiveRef.current = isAiActive;
  }, [isAiActive]);


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

    if (isAiActiveRef.current && gesture !== "Open_Palm") return;

    if (now - lastCommandTime.current < 800) return;

    let commandSent = false;

    switch (gesture) {
      case "Open_Palm":
        window.speechSynthesis.cancel(); // עוצר את הקול מיד
        if (isAiActiveRef.current) {
          stopLiveMode();
          setStatusText("Active! Show Hand ✋");
          return;
        }
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
        if (now - lastSpeedToggleTime.current > 2000) {
          setStatusText("⚡ Toggling Speed...");
          sendCommandToYouTube("toggleSpeed");
          lastSpeedToggleTime.current = now; // עדכון זמן הנעילה
          commandSent = true;
        } else {
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
        activateLiveVoiceMode();
        break;

      default: break;
    }

    if (commandSent) lastCommandTime.current = now;
  };


  const stopLiveMode = () => {
    console.log("Stopping live mode...")
    setIsAiActive(false);
    setSessionToken(null);
    setStatusText("Active! Show Hand ✋");
  };

  const activateLiveVoiceMode = async () => {
    try {
      if (isAiActiveRef.current) return;
      isAiActiveRef.current = true;
      const tabUrl = await getCurrentTabUrl();

      setStatusText("🎟️ Fetching Session...");

      // קריאה לשרת הפייתון שלך
      // הכתובת של התוסף עצמו תמיד תהיה chrome-extension://...
      const isDevelopment = chrome.runtime.getURL('').includes('localhost') ||
        !('update_url' in chrome.runtime.getManifest());
      console.log("isDevelopment", isDevelopment);
      const API_BASE_URL = isDevelopment
        ? 'http://localhost:8000'
        : 'https://airtouch-backend.onrender.com';
      const response = await fetch(`${API_BASE_URL}/gen-token?video_url=${encodeURIComponent(tabUrl)}`);
      const data = await response.json();

      if (data.token) {
        setSessionToken(data.token);
        setIsAiActive(true);
        setStatusText("🎙️ Listening...");
        sendCommandToYouTube("pause");
      }
    } catch (err) {
      console.error("Failed to get token", err);
      setStatusText("❌ Connection Failed");
    }
  };

  useEffect(() => {
    // אם ה-AI פעיל והקומפוננטה כבר קיימת ב-DOM
    if (isAiActive && liveAudioRef.current) {
      console.log("GDM Component is ready, starting recording...");
      liveAudioRef.current.startRecording();
    }
  }, [isAiActive]); // האפקט ירוץ בכל פעם ש-isAiActive משתנה

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
                opacity: 1,
                transition: "opacity 0.5s"
              }}
            />
            {isAiActive && (
              <gdm-live-audio token={sessionToken} ref={liveAudioRef}></gdm-live-audio>
            )}

            <div className="overlay-text">
              👁️ {lastGesture}
            </div>
          </>
        )}
      </div>

      <div style={{
        backgroundColor: "#e3f2fd",
        color: "#1565c0",

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

      <Legend isActive={appState === "running"} isAiActive={isAiActive} />

    </div>
  );
}