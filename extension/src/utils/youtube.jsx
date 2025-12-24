/* global chrome */

export const sendCommandToYouTube = (command, value = null) => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (cmd, val) => {
            const video = document.querySelector('video');

            // --- לוגיקה חכמה לדילוג (Skip Logic) ---
            if (cmd === 'skip') {
                // 1. רשימת כל הכפתורים האפשריים לדילוג על פרסומת (יוטיוב משנים את זה כל הזמן)
                const adSkipBtn = document.querySelector('.ytp-ad-skip-button') 
                               || document.querySelector('.ytp-ad-skip-button-modern')
                               || document.querySelector('.ytp-skip-ad-button')
                               || document.querySelector('.ytp-ad-overlay-close-button'); // באנרים קופצים

                if (adSkipBtn) {
                    adSkipBtn.click();
                    return; // הצלחנו לדלג על מודעה - עוצרים כאן!
                }

                // 2. בדיקת בטיחות: האם אנחנו בתוך פרסומת כרגע?
                // יוטיוב מוסיפים מחלקה 'ad-showing' לנגן הראשי כשיש פרסומת
                const player = document.querySelector('#movie_player');
                const isAdPlaying = player && player.classList.contains('ad-showing');

                if (isAdPlaying) {
                    // אם אנחנו בפרסומת אבל לא מצאנו כפתור דילוג (למשל פרסומת של 5 שניות)
                    // הפתרון: מריצים את הוידאו של הפרסומת לסוף שלו
                    if (video) {
                        video.currentTime = video.duration || 1000;
                    }
                    return; // חשוב מאוד! לא לעבור לסרטון הבא
                }

                // 3. רק אם אין שום מודעה - עוברים לסרטון הבא
                const nextBtn = document.querySelector('.ytp-next-button');
                if (nextBtn) { 
                    nextBtn.click(); 
                }
                return;
            }
            // --- סוף לוגיקת דילוג ---

            if (!video) return;

            switch (cmd) {
                case 'play': video.play(); break;
                case 'pause': video.pause(); break;
                case 'seek': video.currentTime += val; break;
                case 'toggleSpeed': 
                    video.playbackRate = (video.playbackRate <= 1) ? 2 : 1;
                    break;
            }
          },
          args: [command, value]
        }).catch(err => console.log("Injection Error:", err));
      }
    });
  }
};

export const getCurrentTabUrl = async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.url) {
        return tab.url;
    }
    return null;
};


export const getYoutubeCurrentTime = async () => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.id) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const video = document.querySelector('video');
          return video ? Math.floor(video.currentTime) : 0;
        },
      });

      // executeScript מחזיר מערך של תוצאות (אחת לכל פריים/טאב)
      // אנחנו לוקחים את התוצאה מהפריים הראשי
      return results[0]?.result || 0;
    }
  }
  return 0;
};