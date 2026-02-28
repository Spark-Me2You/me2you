/**
 * OpenCV Worker
 * TODO: Implement off-thread CV processing for 24fps+ performance
 */

// Web Worker message handler
// TODO: Implement worker message handlers
self.onmessage = (event: MessageEvent) => {
  const { type, data: _data } = event.data;

  switch (type) {
    case 'PROCESS_FRAME':
      // TODO: Process video frame with OpenCV
      break;
    case 'INIT':
      // TODO: Initialize OpenCV.js in worker
      break;
    default:
      console.warn('Unknown worker message type:', type);
  }
};
