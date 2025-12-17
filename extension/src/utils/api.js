// src/utils/api.js

export const askGemini = async (text) => {
    try {
        // שימי לב: זו הכתובת של השרת שלך (FastAPI/Flask)
        // וודאי שהשרת פתוח ומאזין בפורט 8000
        const response = await fetch('http://127.0.0.1:8000/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: text })
        });

        if (!response.ok) {
            throw new Error("Server Error");
        }

        const data = await response.json();
        return data.answer; // מניחים שהשרת מחזיר JSON עם שדה answer

    } catch (error) {
        console.error("API Error:", error);
        return "Error connecting to AI Server.";
    }
};