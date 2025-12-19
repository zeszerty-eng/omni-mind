import { supabase } from '@/integrations/supabase/client';

export interface SystemMetric {
  id: string;
  organization_id: string;
  metric_type: string;
  metric_value: number;
  metadata: Record<string, any>;
  recorded_at: string;
}

export interface MetricsSummary {
  metric_type: string;
  avg_value: number;
  max_value: number;
  min_value: number;
  last_value: number;
}

export class MetricsService {
  /**
   * Enregistrer un métrique système
   */
  async recordMetric(
    organizationId: string,
    type: string,
    value: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('system_metrics')
      .insert({
        organization_id: organizationId,
        metric_type: type,
        metric_value: value,
        metadata
      });

    if (error) throw error;
  }

  /**
   * Récupérer les métriques récents pour une organisation
   */
  async getRecentMetrics(
    organizationId: string,
    metricType?: string,
    limit: number = 100
  ): Promise<SystemMetric[]> {
    let query = supabase
      .from('system_metrics')
      .select('*')
      .eq('organization_id', organizationId);

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }

    const { data, error } = await query
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtenir un résumé des métriques (agrégation)
   */
  async getMetricsSummary(
    organizationId: string,
    metricType: string,
    timeRangeHours: number = 24
  ): Promise<MetricsSummary | null> {
    const { data, error } = await supabase
      .from('system_metrics')
      .select('metric_value, recorded_at')
      .eq('organization_id', organizationId)
      .eq('metric_type', metricType)
      .gte('recorded_at', new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const values = data.map(m => Number(m.metric_value));
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      metric_type: metricType,
      avg_value: sum / values.length,
      max_value: Math.max(...values),
      min_value: Math.min(...values),
      last_value: values[0]
    };
  }

  /**
   * Récupérer les métriques de sécurité (exemple: tentatives de login, violations DLP)
   */
  async getSecurityMetrics(organizationId: string): Promise<Record<string, number>> {
    const { data: dlpViolations, error: dlpError } = await supabase
      .from('dlp_violations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: auditAnomalies, error: auditError } = await supabase
      .from('audit_logs_immutable')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_suspicious', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (dlpError || auditError) throw dlpError || auditError;

    return {
      dlp_violations_24h: dlpViolations?.length || 0,
      suspicious_activities_24h: auditAnomalies?.length || 0
    };
  }
}

export const metricsService = new MetricsService();
