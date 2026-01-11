/**
 * Worker script for JSON serialization
 * Runs in a worker thread to avoid blocking the main event loop
 */

import { parentPort } from "worker_threads";

interface SerializeTask {
  id: string;
  data: unknown;
}

if (!parentPort) {
  throw new Error("Worker must be run in a worker thread");
}

parentPort.on("message", (task: SerializeTask) => {
  try {
    // Serialize data to JSON string, then convert to Buffer
    const jsonString = JSON.stringify(task.data);
    const buffer = Buffer.from(jsonString, "utf-8");
    parentPort?.postMessage({ id: task.id, buffer, error: null });
  } catch (error) {
    parentPort?.postMessage({
      id: task.id,
      buffer: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
