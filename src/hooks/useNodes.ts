import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface NodeData {
  id: string;
  user_id: string;
  content_hash: string | null;
  mime_type: string | null;
  original_name: string;
  smart_name: string | null;
  raw_content: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}

export const useNodes = () => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNodes = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNodes((data as NodeData[]) || []);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les fichiers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createNode = useCallback(async (nodeData: Partial<NodeData>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('nodes')
        .insert({
          ...nodeData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newNode = data as NodeData;
      setNodes(prev => [newNode, ...prev]);
      return newNode;
    } catch (error) {
      console.error('Error creating node:', error);
      throw error;
    }
  }, [user]);

  const updateNode = useCallback(async (id: string, updates: Partial<NodeData>) => {
    try {
      const { data, error } = await supabase
        .from('nodes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedNode = data as NodeData;
      setNodes(prev => prev.map(n => n.id === id ? updatedNode : n));
      return updatedNode;
    } catch (error) {
      console.error('Error updating node:', error);
      throw error;
    }
  }, []);

  const deleteNode = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNodes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting node:', error);
      throw error;
    }
  }, []);

  const searchNodes = useCallback((query: string) => {
    if (!query) return nodes;
    
    const lowerQuery = query.toLowerCase();
    return nodes.filter(node => 
      node.original_name?.toLowerCase().includes(lowerQuery) ||
      node.smart_name?.toLowerCase().includes(lowerQuery) ||
      node.summary?.toLowerCase().includes(lowerQuery) ||
      node.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      node.raw_content?.toLowerCase().includes(lowerQuery)
    );
  }, [nodes]);

  return {
    nodes,
    loading,
    fetchNodes,
    createNode,
    updateNode,
    deleteNode,
    searchNodes,
  };
};
