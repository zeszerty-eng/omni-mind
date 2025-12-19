-- Migration 006: System Metrics & Performance Tracking
-- Description: Table pour le suivi des métriques système en temps réel

-- ============================================================================
-- Table: system_metrics
-- Description: Métriques de performance et d'usage système
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Métrique
  metric_type TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'api_latency', etc.
  metric_value NUMERIC NOT NULL,
  
  -- Métadonnées additionnelles
  metadata JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "unit": "percent",
    "node_id": "server-01",
    "request_path": "/api/v1/data"
  }
  */
  
  -- Audit
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_org_id ON system_metrics(organization_id);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system metrics"
  ON system_metrics FOR SELECT
  USING (
    organization_id IS NULL OR 
    is_organization_admin(auth.uid(), organization_id)
  );

CREATE POLICY "System can insert metrics"
  ON system_metrics FOR INSERT
  WITH CHECK (true); -- Autorisé pour les services système/API

COMMENT ON TABLE system_metrics IS 'Métriques de performance et d''usage système';
