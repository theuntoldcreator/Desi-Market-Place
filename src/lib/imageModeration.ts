import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let nsfwModel: nsfwjs.NSFWJS;
let objectModel: cocoSsd.ObjectDetection;

// A list of object classes from the COCO-SSD model that we want to block.
// Note: This model cannot detect specific things like drugs, pills, or paraphernalia.
// It can only identify general objects. We are using it to block items that might
// be associated with alcohol or weapons.
const BLOCKED_OBJECTS = ['wine glass', 'bottle', 'knife'];

/**
 * Loads the machine learning models into memory.
 * This function is called once and the models are reused for subsequent checks.
 */
export const loadModels = async () => {
  if (!nsfwModel || !objectModel) {
    console.log("Loading moderation models...");
    // Ensure TensorFlow.js is ready
    await tf.ready();
    // Load both models in parallel for efficiency
    [nsfwModel, objectModel] = await Promise.all([
      nsfwjs.load('/model/', { size: 299 }), // Adjusted path for public assets
      cocoSsd.load(),
    ]);
    console.log("Moderation models loaded.");
  }
};

export interface ModerationResult {
  isSafe: boolean;
  message: string;
}

/**
 * Analyzes an image using the loaded models to check for inappropriate content.
 * @param imageElement The HTML <img> element to analyze.
 * @returns A result object indicating if the image is safe and a corresponding message.
 */
export const moderateImage = async (imageElement: HTMLImageElement): Promise<ModerationResult> => {
  // Ensure models are loaded before proceeding
  await loadModels();

  // 1. NSFW Content Check
  const nsfwPredictions = await nsfwModel.classify(imageElement);
  const nsfwViolation = nsfwPredictions.find(p =>
    (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.5 ||
    (p.className === 'Sexy') && p.probability > 0.5
  );

  if (nsfwViolation) {
    return {
      isSafe: false,
      message: `Blocked: ${nsfwViolation.className} content detected.`,
    };
  }

  // 2. Prohibited Object Detection
  const objectPredictions = await objectModel.detect(imageElement);
  const objectViolation = objectPredictions.find(p => BLOCKED_OBJECTS.includes(p.class));

  if (objectViolation) {
    return {
      isSafe: false,
      message: `Blocked: Prohibited item (${objectViolation.class}) detected.`,
    };
  }

  // If no violations are found, the image is considered safe.
  return {
    isSafe: true,
    message: 'Image is safe.',
  };
};