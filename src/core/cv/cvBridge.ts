/**
 * CV Bridge
 * TODO: Implement Worker↔React communication layer
 */

/**
 * Send message to CV worker
 * TODO: Implement worker communication
 */
export const sendToWorker = (worker: Worker, type: string, data: any) => {
  // TODO: Send message to worker
  worker.postMessage({ type, data });
};

/**
 * Handle worker message
 * TODO: Implement worker message handling
 */
export const handleWorkerMessage = (event: MessageEvent, callback: (data: any) => void) => {
  // TODO: Process worker response
  callback(event.data);
};
