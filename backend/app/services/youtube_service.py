from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from fastapi import HTTPException
from typing import List, Dict, Any

def extract_video_id(url: str) -> str:
    """
    מחלץ את ה-ID של הסרטון מתוך ה-URL.
    """
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    else:
        raise ValueError("Invalid YouTube URL")

async def get_video_transcript(video_url: str)-> str:
    """
    מקבל URL, שולף את התמלול באופן אוטומטי ומחזיר אותו כמחרוזת אחת באיזשהי שפה שנמצאה.
    """
    try:
        video_id = extract_video_id(video_url)

        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)


        try:
            transcript_to_fetch = transcript_list.find_transcript(['he', 'en'])
        except NoTranscriptFound:
            all_transcripts = list(transcript_list)
            if not all_transcripts:
                raise NoTranscriptFound()

            transcript_to_fetch = all_transcripts[0]

            print(f"Warning: Using transcript in {transcript_to_fetch.language} - Gemini will translate.")

        fetched_transcript_object = transcript_to_fetch.fetch()
        raw_data = fetched_transcript_object.to_raw_data()

        full_text = " ".join([item['text'] for item in raw_data])
        print(full_text)

        return f"[LANGUAGE_CODE: {transcript_to_fetch.language_code}] {full_text}"

    except TranscriptsDisabled:
        raise HTTPException(status_code=404,
                            detail="Transcript is disabled for this video by the creator.")
    except NoTranscriptFound:
        raise HTTPException(status_code=404,
                            detail="No direct or translatable transcript found for this video in available languages.")
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        raise HTTPException(status_code=404, detail=f"An error occurred while retrieving transcript: {str(e)}")