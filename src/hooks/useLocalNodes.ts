import { useState, useCallback, useEffect } from 'react';
import { db, type LocalDocument } from '@/services/local-ai/db';
import { aiPipeline } from '@/services/local-ai/pipeline.service';
import { toast } from '@/hooks/use-toast';

export const useLocalNodes = () => {
  const [nodes, setNodes] = useState<LocalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const allDocs = await db.documents.toArray();
      setNodes(allDocs.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error fetching local nodes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    const results: LocalDocument[] = [];

    try {
      for (const file of files) {
        try {
          const doc = await aiPipeline.processFile(file);
          results.push(doc);
          setNodes(prev => [doc, ...prev]);
          toast({
            title: 'Analyse Locale Réussie',
            description: `${file.name} a été vectorisé et stocké dans votre navigateur.`,
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast({
            title: 'Erreur IA',
            description: `Impossible d'analyser ${file.name} localement.`,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsProcessing(false);
    }
    return results;
  }, []);

  const searchNodes = useCallback(async (query: string) => {
    if (!query) {
      const all = await db.documents.toArray();
      return all.sort((a, b) => b.createdAt - a.createdAt);
    }
    return await aiPipeline.semanticSearch(query);
  }, []);

  const deleteNode = useCallback(async (id: number) => {
    try {
      await db.documents.delete(id);
      setNodes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting local node:', error);
    }
  }, []);

  return {
    nodes,
    loading,
    isProcessing,
    fetchNodes,
    processFiles,
    searchNodes,
    deleteNode,
  };
};
