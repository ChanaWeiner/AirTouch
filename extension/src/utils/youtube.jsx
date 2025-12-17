/* global chrome */

export const sendCommandToYouTube = (command, value = null) => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (cmd, val) => {
            const video = document.querySelector('video');
            
            // כפתורי דילוג
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
                
                // לוגיקת המהירות (Toggle)
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