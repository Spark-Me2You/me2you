/**
 * Download MediaPipe Model Files (local development)
 *
 */

import { createWriteStream, existsSync, mkdirSync } from "fs";
import { stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { finished } from "stream/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Model definitions
const MODELS = [
  {
    name: "Pose Landmarker",
    filename: "pose_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
    expectedSize: 25 * 1024 * 1024, // ~25MB
  },
  {
    name: "Face Mesh",
    filename: "face_mesh.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    expectedSize: 10 * 1024 * 1024, // ~10MB
  },
  {
    name: "Gesture Recognizer",
    filename: "gesture_recognizer.task",
    url: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task",
    expectedSize: 20 * 1024 * 1024, // ~20MB
  },
  {
    name: "Image Segmenter (Selfie Multiclass)",
    filename: "selfie_multiclass_256x256.tflite",
    url: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
    expectedSize: 16 * 1024 * 1024, // ~16MB
  },
];

const MODELS_DIR = join(__dirname, "..", "public", "models");
const FORCE_DOWNLOAD = process.argv.includes("--force");

/**
 * Download a single model file
 */
async function downloadModel(
  url: string,
  filePath: string,
  modelName: string,
): Promise<void> {
  console.log(`  Downloading ${modelName}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const fileStream = createWriteStream(filePath);
  // @ts-ignore - Node 18+ supports web streams
  await finished(Readable.fromWeb(response.body).pipe(fileStream));

  console.log(`  ✓ Downloaded ${modelName}`);
}

/**
 * Check if a model file exists and has reasonable size
 */
async function isModelValid(
  filePath: string,
  expectedSize: number,
): Promise<boolean> {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const stats = await stat(filePath);
    // File should be at least 50% of expected size (sanity check)
    return stats.size > expectedSize * 0.5;
  } catch {
    return false;
  }
}

/**
 * Main download orchestrator
 */
async function main() {
  console.log("MediaPipe Model Downloader\n");

  // Ensure models directory exists
  if (!existsSync(MODELS_DIR)) {
    console.log("Creating models directory...");
    mkdirSync(MODELS_DIR, { recursive: true });
  }

  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Download each model
  for (const model of MODELS) {
    const filePath = join(MODELS_DIR, model.filename);
    const exists = await isModelValid(filePath, model.expectedSize);

    if (exists && !FORCE_DOWNLOAD) {
      console.log(`Skipping ${model.name} (already exists)`);
      skippedCount++;
      continue;
    }

    try {
      if (exists && FORCE_DOWNLOAD) {
        console.log(`Re-downloading ${model.name}...`);
      }
      await downloadModel(model.url, filePath, model.name);
      downloadedCount++;
    } catch (error) {
      console.error(`Failed to download ${model.name}:`, error);
      failedCount++;
    }
  }

  // Summary
  console.log("\nSummary:");
  console.log(`  Downloaded: ${downloadedCount}`);
  console.log("  Skipped: ${skippedCount}");
  if (failedCount > 0) {
    console.log(`  Failed: ${failedCount}`);
  }

  // Exit with error if any downloads failed
  if (failedCount > 0) {
    console.error(
      "\nSome models failed to download. Please check your network connection and try again.",
    );
    process.exit(1);
  }

  console.log("\nAll models ready!\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
