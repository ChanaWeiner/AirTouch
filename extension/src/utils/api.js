// src/utils/api.js

export const askGemini = async (video_url, text) => {
    try {
        // שימי לב: זו הכתובת של השרת שלך (FastAPI/Flask)
        // וודאי שהשרת פתוח ומאזין בפורט 8000
        const response = await fetch('http://127.0.0.1:8000/ask-gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_url: video_url,
                user_question: text
            })
        });

        if (!response.ok) {
            throw new Error("Server Error");
        }

        const data = await response.json();
        return data.answer; // מניחים שהשרת מחזיר JSON עם שדה answer

    } catch (error) {
        console.error("API Error:", error);
        return `Error: ${error.message} | Stack: ${error.stack ? "Check Console" : "No Stack"}`;
    }
};