import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import Header from "./components/Header";
import Legend from "./components/Legend";
import PermissionScreen from "./components/PermissionScreen";
import { sendCommandToYouTube, getCurrentTabUrl, getYoutubeCurrentTime } from "./utils/youtube";
import "./App.css";
import "./gdm/gdm-live-audio";

export default function App() {
  const webcamRef = useRef(null);
  const isSetupTab = window.location.search.includes("setup=true");
  const liveAudioRef = useRef(null);

  const [appState, setAppState] = useState("loading");
  const [statusText, setStatusText] = useState("System Paused");
  const [lastGesture, setLastGesture] = useState("-");
  
  const [isAiActive, setIsAiActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isAiActiveRef = useRef(false);
  
  const [sessionToken, setSessionToken] = useState(null);
  
  const lastCommandTime = useRef(0);
  const lastSpeedToggleTime = useRef(0);
  const recognizerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    isAiActiveRef.current = isAiActive;
    if (isAiActive && liveAudioRef.current) {
        setTimeout(() => {
            liveAudioRef.current.startRecording();
        }, 100);
    }
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
      setStatusText("Error loading model");
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
    
    if (isAiActiveRef.current || isConnecting) {
        if (gesture === "Open_Palm" && isAiActiveRef.current) {
             stopLiveMode();
        }
        return; 
    }

    if (now - lastCommandTime.current < 800) return;

    let commandSent = false;
    switch (gesture) {
       case "Open_Palm":
         window.speechSynthesis.cancel();
         setStatusText("Paused");
         sendCommandToYouTube("pause");
         commandSent = true; break;
       case "Closed_Fist":
         setStatusText("Playing");
         sendCommandToYouTube("play");
         commandSent = true; break;
       case "Victory":
         if (now - lastSpeedToggleTime.current > 2000) {
            setStatusText("Speed Toggled");
            sendCommandToYouTube("toggleSpeed");
            lastSpeedToggleTime.current = now;
            commandSent = true;
         } break;
       case "Thumb_Up":
         setStatusText("+10s");
         sendCommandToYouTube("seek", 10);
         commandSent = true; break;
       case "Thumb_Down":
         setStatusText("-10s");
         sendCommandToYouTube("seek", -10);
         commandSent = true; break;
       case "ILoveYou":
         setStatusText("Skipping");
         sendCommandToYouTube("skip");
         commandSent = true; break;
       case "Pointing_Up":
         activateLiveVoiceMode();
         break;
       default: break;
    }
    if (commandSent) lastCommandTime.current = now;
  };

  const stopLiveMode = () => {
    setIsAiActive(false);
    setIsConnecting(false);
    setSessionToken(null);
    setStatusText("Ready");
  };

 const activateLiveVoiceMode = async () => {
    try {
      if (isAiActiveRef.current || isConnecting) return;
      isAiActiveRef.current = true;
      setIsConnecting(true);
      
      const tabUrl = await getCurrentTabUrl();
      const currentTime = await getYoutubeCurrentTime();
      console.log("Current Time:", currentTime);

      setStatusText("🎟️ Fetching Session...");

      const API_BASE_URL = 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/gen-token?video_url=${encodeURIComponent(tabUrl)}&current_time=${currentTime}`);
      const data = await response.json();

      if (data.token) {
        setSessionToken(data.token);
        setIsAiActive(true);
        setStatusText("Listening...");
        sendCommandToYouTube("pause");
      }
    } catch (err) {
      console.error(err);
      setStatusText("Connection Failed");
    } finally {
      setIsConnecting(false); 
    }
  };
  
  if (appState === "permission_needed") {
    return <PermissionScreen onAction={handlePermissionAction} isSetupTab={isSetupTab} />;
  }

  const statusClass = `status-pill ${appState === "running" ? "active" : ""}`;

  return (
    <div className="app-container">
      
      {isAiActive && (
        <div className="ai-immersive-overlay">
            <div className="ai-visual-box">
                <gdm-live-audio 
                    token={sessionToken} 
                    ref={liveAudioRef}
                ></gdm-live-audio>
            </div>
            <div className="control-capsule" onClick={stopLiveMode}>
                <div className="capsule-text">
                    <span>✋</span> Raise hand to stop
                </div>
            </div>
        </div>
      )}

      <Header />
      
      <div className="camera-frame">
        {appState === "loading" && (
            <div className="loader-center">
                <div className="spinner white"></div>
            </div>
        )}

        {appState === "error" && <span style={{ color: "#EA4335" }}>Camera Error</span>}
        
        {appState === "running" && (
          <>
            <Webcam ref={webcamRef} className="webcam-video" screenshotFormat="image/jpeg" />
            
            {!isAiActive && (
              <div className="gesture-badge">
                 {isConnecting ? (
                     <div className="spinner blue" style={{width:16, height:16}}></div>
                 ) : (
                    <>
                        <span>{lastGesture !== "-" ? lastGesture : "Waiting..."}</span>
                        {lastGesture !== "-" && <span>✨</span>}
                    </>
                 )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={statusClass}>
        {isConnecting ? (
            <div className="spinner blue"></div>
        ) : (
            <>
                {isAiActive ? "🎙️ " : appState === "running" ? "🟢 " : "⏳ "}
                {statusText}
            </>
        )}
      </div>

      <Legend isActive={appState === "running"} isAiActive={false} />
    </div>
  );
}