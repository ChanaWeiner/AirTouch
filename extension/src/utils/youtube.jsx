/* global chrome */

export const sendCommandToYouTube = (command, value = null) => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (cmd, val) => {
            const video = document.querySelector('video');
            //skip logic
            if (cmd === 'skip') {
              const adSkipBtn = document.querySelector('.ytp-ad-skip-button')
                || document.querySelector('.ytp-ad-skip-button-modern')
                || document.querySelector('.ytp-skip-ad-button')
                || document.querySelector('.ytp-ad-overlay-close-button'); // באנרים קופצים

              if (adSkipBtn) {
                adSkipBtn.click();
                return;
              }


              const player = document.querySelector('#movie_player');
              const isAdPlaying = player && player.classList.contains('ad-showing');

              if (isAdPlaying) {
                if (video) {
                  video.currentTime = video.duration || 1000;
                }
                return;
              }

              const nextBtn = document.querySelector('.ytp-next-button');
              if (nextBtn) {
                nextBtn.click();
              }
              return;
            }

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

      return results[0]?.result || 0;
    }
  }
  return 0;
};