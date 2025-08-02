import { useState, useRef } from 'react';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { useToast } from '@/hooks/use-toast';

interface Prediction {
  className: 'Porn' | 'Hentai' | 'Sexy' | 'Neutral' | 'Drawing';
  probability: number;
}

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

export function useNsfwCheck() {
  const { toast, dismiss } = useToast();
  const [isModelLoading, setIsModelLoading] = useState(false);
  const loadingToastId = useRef<string | null>(null);

  const loadModel = () => {
    if (!modelPromise) {
      setIsModelLoading(true);
      const { id } = toast({ title: "⏳ Initializing image scanner...", description: "This may take a moment." });
      loadingToastId.current = id;
      
      tf.setBackend('webgl').catch(err => console.warn("WebGL backend not available, falling back.", err));
      
      modelPromise = nsfwjs.load();
      modelPromise
        .then(() => {
          setIsModelLoading(false);
          if (loadingToastId.current) dismiss(loadingToastId.current);
          toast({ title: "✅ Image scanner ready!" });
        })
        .catch(error => {
          console.error("Failed to load NSFWJS model", error);
          if (loadingToastId.current) dismiss(loadingToastId.current);
          toast({ title: "Error", description: "Could not load image scanner.", variant: "destructive" });
          setIsModelLoading(false);
          modelPromise = null; // Reset on failure
        });
    }
    return modelPromise;
  };

  const checkImage = async (file: File): Promise<boolean> => {
    const { id: checkingToastId } = toast({ title: "⏳ Checking image..." });

    try {
      const model = await loadModel();
      if (!model) throw new Error("Model not available");

      const image = new Image();
      image.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const predictions: Prediction[] = await model.classify(image);
      URL.revokeObjectURL(image.src); // Clean up memory

      let isSafe = true;
      let reason = '';
      for (const prediction of predictions) {
        if ((prediction.className === 'Porn' || prediction.className === 'Hentai') && prediction.probability > 0.4) {
          isSafe = false;
          reason = `Flagged as ${prediction.className}.`;
          break;
        }
        if (prediction.className === 'Sexy' && prediction.probability > 0.5) {
          isSafe = false;
          reason = 'Flagged as potentially suggestive.';
          break;
        }
      }
      
      dismiss(checkingToastId);

      if (isSafe) {
        toast({ title: "✅ Image is safe", description: "Ready for upload." });
        return true;
      } else {
        toast({ title: "🚫 Image blocked", description: `This image cannot be uploaded. ${reason}`, variant: "destructive" });
        return false;
      }
    } catch (error) {
      console.error("Error during NSFW check:", error);
      dismiss(checkingToastId);
      toast({ title: "Error", description: "Could not check the image.", variant: "destructive" });
      return false; // Fail-safe: block if check fails
    }
  };

  return { checkImage, isModelLoading };
}