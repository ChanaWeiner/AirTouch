// public/pcm-processor.js
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32Data = input[0];
      // שולח את נתוני האודיו הגולמיים חזרה ל-Main Thread
      this.port.postMessage(float32Data);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);