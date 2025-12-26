# 🖐️ AirTouch

**AirTouch** is a sophisticated browser extension that enables touchless control of YouTube using real-time hand gesture recognition. By combining Computer Vision and Generative AI, AirTouch offers a seamless, futuristic viewing experience.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/fastapi-109989?style=for-the-badge&logo=fastapi&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-047FF2?style=for-the-badge&logo=google&logoColor=white)

---

## ✨ Features

- ✋ **Hand Gesture Control:** Control playback without touching your hardware.
- 🎙️ **AI Voice Mode:** Engage in a live conversation with Gemini AI about the video you are watching.
- ⚡ **Low Latency:** High-performance gesture detection using Google's MediaPipe (GPU accelerated).
- 🎨 **Modern Interface:** Intuitive UI with live camera feedback and a gesture guide.
- 🌍 **Context Aware:** The AI understands exactly where you are in the video when you ask questions.

## 📸 Gesture Dictionary

| Gesture | Action |
| :--- | :--- |
| 🖐️ **Open Palm** | **Pause** video / Stop AI Voice Mode |
| ✊ **Closed Fist** | **Play** video |
| 👍 **Thumb Up** | **Seek Forward** (+10 seconds) |
| 👎 **Thumb Down** | **Seek Backward** (-10 seconds) |
| ✌️ **Victory Sign** | **Toggle Speed** (Normal / 2x) |
| ☝️ **Pointing Up** | **Activate Gemini AI** Voice Mode |
| 🤟 **"I Love You"** | **Skip** to next video |

---

## 🚀 Local Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.9 or higher)
- **Google Gemini API Key** (Get it from [Google AI Studio](https://aistudio.google.com/))

### 1. Setup Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
# Create a .env file and add: AIR_TOUCH_KEY=your_google_api_key_here
uvicorn main:app --reload
```
2. Setup Frontend (Extension)
```bash

cd extension
npm install
npm run build
```
3. Load to Chrome
Open Chrome and go to chrome://extensions/.

Toggle Developer mode (top right).

Click Load unpacked and select the dist folder from your extension directory.

Pin AirTouch and open any YouTube video!

---

### 🏗️ Architecture
**Frontend:** React 18, TypeScript, Vite, Tailwind CSS.

**AI/ML:** Google MediaPipe (Gesture Recognizer).

**Backend:** Python, FastAPI, Google GenAI (Gemini 2.5 Flash).

**Communication:** REST API & Chrome Messaging API.

**Developed by Chana & Nechama**
