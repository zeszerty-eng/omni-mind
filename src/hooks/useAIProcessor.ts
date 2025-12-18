import { useState, useCallback } from "react";

export interface ProcessedFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  summary?: string;
  tags?: string[];
  extractedData?: Record<string, string>;
}

// Simulated AI processing - in production this would use Transformers.js with WebGPU
const generateSmartName = (originalName: string, type: string): string => {
  const date = new Date();
  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).replace(/\//g, "-");

  const extension = originalName.split(".").pop() || "";
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  // Smart renaming based on patterns
  if (type.startsWith("image/")) {
    if (baseName.toLowerCase().includes("img") || baseName.toLowerCase().includes("photo")) {
      return `Photo_${dateStr}.${extension}`;
    }
    if (baseName.toLowerCase().includes("screen")) {
      return `Capture_Ecran_${dateStr}.${extension}`;
    }
    return `Image_${dateStr}.${extension}`;
  }

  if (type.includes("pdf")) {
    if (baseName.toLowerCase().includes("facture") || baseName.toLowerCase().includes("invoice")) {
      return `Facture_${dateStr}.pdf`;
    }
    if (baseName.toLowerCase().includes("contrat") || baseName.toLowerCase().includes("contract")) {
      return `Contrat_${dateStr}.pdf`;
    }
    return `Document_${dateStr}.pdf`;
  }

  return `${baseName}_${dateStr}.${extension}`;
};

const generateSummary = (type: string, name: string): string => {
  if (type.startsWith("image/")) {
    return "Image analysée. Contenu visuel détecté. Prêt pour l'extraction OCR si du texte est présent.";
  }
  if (type.includes("pdf")) {
    return "Document PDF scanné. Texte extrait et indexé pour la recherche sémantique.";
  }
  if (type.startsWith("audio/")) {
    return "Fichier audio détecté. Transcription Whisper disponible pour conversion en texte.";
  }
  return "Fichier analysé et indexé. Prêt pour la recherche contextuelle.";
};

const generateTags = (type: string, name: string): string[] => {
  const tags: string[] = [];
  
  if (type.startsWith("image/")) tags.push("Image", "Visuel");
  if (type.includes("pdf")) tags.push("Document", "PDF");
  if (type.startsWith("audio/")) tags.push("Audio", "Média");
  
  if (name.toLowerCase().includes("facture")) tags.push("Facture", "Finance");
  if (name.toLowerCase().includes("contrat")) tags.push("Contrat", "Légal");
  if (name.toLowerCase().includes("photo")) tags.push("Photo", "Souvenir");
  
  return tags.slice(0, 4);
};

const generateExtractedData = (type: string): Record<string, string> => {
  if (type.includes("pdf")) {
    return {
      "Type": "Document",
      "Pages": String(Math.floor(Math.random() * 10) + 1),
    };
  }
  if (type.startsWith("image/")) {
    return {
      "Format": type.split("/")[1]?.toUpperCase() || "Image",
      "Résolution": "1920x1080",
    };
  }
  return {};
};

export const useAIProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newProcessedFiles: ProcessedFile[] = files.map((file) => {
      const smartName = generateSmartName(file.name, file.type);
      return {
        id: crypto.randomUUID(),
        name: smartName,
        originalName: file.name,
        type: file.type,
        size: file.size,
        summary: generateSummary(file.type, file.name),
        tags: generateTags(file.type, smartName),
        extractedData: generateExtractedData(file.type),
      };
    });

    setProcessedFiles((prev) => [...newProcessedFiles, ...prev]);
    setIsProcessing(false);

    return newProcessedFiles;
  }, []);

  const searchFiles = useCallback(
    (query: string): ProcessedFile[] => {
      if (!query) return processedFiles;
      
      const lowerQuery = query.toLowerCase();
      return processedFiles.filter(
        (file) =>
          file.name.toLowerCase().includes(lowerQuery) ||
          file.originalName.toLowerCase().includes(lowerQuery) ||
          file.summary?.toLowerCase().includes(lowerQuery) ||
          file.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },
    [processedFiles]
  );

  return {
    isProcessing,
    processedFiles,
    processFiles,
    searchFiles,
  };
};
