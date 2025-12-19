import { pipeline, env, type FeatureExtractionPipeline, type ImageToTextPipeline } from '@xenova/transformers';

// Configuration du worker
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline | null = null;
let ocr: ImageToTextPipeline | null = null;

async function getExtractor() {
  if (!extractor) {
    self.postMessage({ status: 'loading', message: 'Chargement du cerveau local...' });
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'webgpu' as any, // Tente WebGPU sinon fallback WASM automatiquement
    });
    self.postMessage({ status: 'ready', message: 'Intelligence locale prête' });
  }
  return extractor;
}

async function getOCR() {
  if (!ocr) {
    self.postMessage({ status: 'loading', message: 'Chargement de l\'OCR local...' });
    try {
      ocr = await pipeline('image-to-text', 'Xenova/tesseract-ocr');
      self.postMessage({ status: 'ready', message: 'OCR prêt' });
    } catch (e) {
      console.warn('OCR model not found, falling back to basic extraction');
    }
  }
  return ocr;
}

self.onmessage = async (event) => {
  const { type, text, image, id } = event.data;

  if (type === 'extract-text' && image) {
    try {
      const model = await getOCR();
      if (model) {
        const output = await model(image);
        self.postMessage({ type: 'text-result', id, text: output[0].generated_text });
      } else {
        self.postMessage({ type: 'text-result', id, text: '' });
      }
    } catch (error) {
      self.postMessage({ type: 'error', id, error: (error as Error).message });
    }
  }

  if (type === 'extract-embedding' && text) {
    try {
      const model = await getExtractor();
      const output = await model(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data as Float32Array);
      
      self.postMessage({ 
        type: 'embedding-result', 
        id, 
        embedding 
      });
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        id, 
        error: (error as Error).message 
      });
    }
  }
};
