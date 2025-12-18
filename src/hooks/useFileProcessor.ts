import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNodes, NodeData } from '@/hooks/useNodes';
import { useStorage } from '@/hooks/useStorage';
import { toast } from '@/hooks/use-toast';

// Utility to generate content hash
const generateHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Smart name generation based on file type and content
const generateSmartName = (originalName: string, mimeType: string): string => {
  const date = new Date();
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).replace(/\//g, '-');

  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').toLowerCase();

  // Image detection
  if (mimeType.startsWith('image/')) {
    if (baseName.includes('img') || baseName.includes('dsc') || /^[0-9]+$/.test(baseName)) {
      return `Photo_${dateStr}.${extension}`;
    }
    if (baseName.includes('screen') || baseName.includes('capture')) {
      return `Capture_Ecran_${dateStr}.${extension}`;
    }
    return `Image_${dateStr}.${extension}`;
  }

  // PDF detection
  if (mimeType.includes('pdf')) {
    if (baseName.includes('facture') || baseName.includes('invoice') || baseName.includes('receipt')) {
      return `Facture_${dateStr}.pdf`;
    }
    if (baseName.includes('contrat') || baseName.includes('contract')) {
      return `Contrat_${dateStr}.pdf`;
    }
    if (baseName.includes('cv') || baseName.includes('resume')) {
      return `CV_${dateStr}.pdf`;
    }
    return `Document_${dateStr}.pdf`;
  }

  // Audio
  if (mimeType.startsWith('audio/')) {
    return `Audio_${dateStr}.${extension}`;
  }

  // Video
  if (mimeType.startsWith('video/')) {
    return `Video_${dateStr}.${extension}`;
  }

  return `${baseName}_${dateStr}.${extension}`;
};

// AI Summary generation (simulated - in production use local LLM)
const generateSummary = (mimeType: string, originalName: string): string => {
  if (mimeType.startsWith('image/')) {
    return 'Image analysée. Contenu visuel détecté. OCR disponible si texte présent.';
  }
  if (mimeType.includes('pdf')) {
    return 'Document PDF scanné. Texte extrait et indexé pour recherche sémantique.';
  }
  if (mimeType.startsWith('audio/')) {
    return 'Fichier audio détecté. Transcription Whisper disponible.';
  }
  if (mimeType.startsWith('video/')) {
    return 'Vidéo détectée. Extraction des frames clés possible.';
  }
  return 'Fichier analysé et indexé pour recherche contextuelle.';
};

// Tag generation
const generateTags = (mimeType: string, originalName: string): string[] => {
  const tags: string[] = [];
  const lowerName = originalName.toLowerCase();

  // Type-based tags
  if (mimeType.startsWith('image/')) tags.push('Image', 'Visuel');
  if (mimeType.includes('pdf')) tags.push('Document', 'PDF');
  if (mimeType.startsWith('audio/')) tags.push('Audio', 'Média');
  if (mimeType.startsWith('video/')) tags.push('Vidéo', 'Média');

  // Content-based tags
  if (lowerName.includes('facture') || lowerName.includes('invoice')) tags.push('Facture', 'Finance');
  if (lowerName.includes('contrat') || lowerName.includes('contract')) tags.push('Contrat', 'Légal');
  if (lowerName.includes('cv') || lowerName.includes('resume')) tags.push('CV', 'Carrière');
  if (lowerName.includes('photo')) tags.push('Photo', 'Souvenir');
  if (lowerName.includes('ticket')) tags.push('Ticket', 'Transport');

  return [...new Set(tags)].slice(0, 5);
};

// Metadata extraction
const extractMetadata = (file: File, mimeType: string): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {
    originalSize: file.size,
    lastModified: new Date(file.lastModified).toISOString(),
  };

  if (mimeType.startsWith('image/')) {
    metadata.format = mimeType.split('/')[1]?.toUpperCase();
  }

  return metadata;
};

export interface ProcessedFile extends NodeData {
  file?: File;
  progress: number;
}

export const useFileProcessor = () => {
  const { user } = useAuth();
  const { nodes, fetchNodes, createNode, updateNode, searchNodes } = useNodes();
  const { uploadFile } = useStorage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<ProcessedFile[]>([]);

  // Fetch nodes on mount
  useEffect(() => {
    if (user) {
      fetchNodes();
    }
  }, [user, fetchNodes]);

  const processFile = async (file: File): Promise<NodeData | null> => {
    if (!user) return null;

    try {
      // Step 1: Generate hash
      const contentHash = await generateHash(file);

      // Step 2: Create initial node
      const smartName = generateSmartName(file.name, file.type);
      const summary = generateSummary(file.type, file.name);
      const tags = generateTags(file.type, file.name);
      const metadata = extractMetadata(file, file.type);

      const node = await createNode({
        content_hash: contentHash,
        mime_type: file.type,
        original_name: file.name,
        smart_name: smartName,
        summary: summary,
        tags: tags,
        metadata: metadata,
        file_size: file.size,
        processing_status: 'processing',
      });

      if (!node) throw new Error('Failed to create node');

      // Step 3: Upload to storage
      const storageUrl = await uploadFile(file);

      // Step 4: Update node with storage URL and complete processing
      const updatedNode = await updateNode(node.id, {
        storage_url: storageUrl,
        processing_status: 'completed',
      });

      return updatedNode;
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return [];

    setIsProcessing(true);
    const results: NodeData[] = [];

    try {
      for (const file of files) {
        try {
          const node = await processFile(file);
          if (node) {
            results.push(node);
            toast({
              title: 'Fichier traité',
              description: `${node.smart_name || node.original_name} analysé avec succès`,
            });
          }
        } catch (error) {
          toast({
            title: 'Erreur',
            description: `Impossible de traiter ${file.name}`,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsProcessing(false);
    }

    return results;
  }, [user]);

  return {
    isProcessing,
    processedFiles: nodes,
    processingQueue,
    processFiles,
    searchFiles: searchNodes,
    refreshFiles: fetchNodes,
  };
};
