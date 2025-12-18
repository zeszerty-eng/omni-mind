import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Relation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: 'part_of' | 'similar_to' | 'reply_to' | 'proof_of' | 'related_to';
  strength: number;
  created_at: string;
}

export const useRelations = () => {
  const { user } = useAuth();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRelations = useCallback(async (nodeIds: string[]) => {
    if (!user || nodeIds.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relations')
        .select('*')
        .or(`source_id.in.(${nodeIds.join(',')}),target_id.in.(${nodeIds.join(',')})`)
        .order('strength', { ascending: false });

      if (error) throw error;
      setRelations((data as Relation[]) || []);
    } catch (error) {
      console.error('Error fetching relations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createRelation = useCallback(async (relationData: Omit<Relation, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('relations')
        .insert(relationData)
        .select()
        .single();

      if (error) throw error;
      
      const newRelation = data as Relation;
      setRelations(prev => [...prev, newRelation]);
      return newRelation;
    } catch (error) {
      console.error('Error creating relation:', error);
      throw error;
    }
  }, []);

  const deleteRelation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('relations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRelations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting relation:', error);
      throw error;
    }
  }, []);

  // Auto-detect similar nodes based on tags
  const detectSimilarities = useCallback((nodes: Array<{ id: string; tags?: string[] }>) => {
    const similarities: Array<{ sourceId: string; targetId: string; strength: number }> = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const tagsA = nodes[i].tags || [];
        const tagsB = nodes[j].tags || [];
        
        const commonTags = tagsA.filter(t => tagsB.includes(t));
        if (commonTags.length > 0) {
          const strength = commonTags.length / Math.max(tagsA.length, tagsB.length);
          if (strength >= 0.3) {
            similarities.push({
              sourceId: nodes[i].id,
              targetId: nodes[j].id,
              strength,
            });
          }
        }
      }
    }

    return similarities;
  }, []);

  return {
    relations,
    loading,
    fetchRelations,
    createRelation,
    deleteRelation,
    detectSimilarities,
  };
};
