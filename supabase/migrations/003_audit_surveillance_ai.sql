-- Migration 003: Audit Surveillance AI System
-- Description: Système d'audit avec logs immuables, analyse comportementale IA,
-- Data Leak Prevention (DLP) et Shadow Archives (WORM)

-- ============================================================================
-- Table: audit_logs_immutable
-- Description: Logs d'audit immuables avec blockchain-style hashing
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs_immutable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Acteur
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  -- Action
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'share', etc.
  resource_type TEXT NOT NULL,
  resource_id UUID,
  target_name TEXT, -- Nom humain de la cible
  
  -- Métadonnées détaillées
  metadata JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "before": {...},  -- État avant modification
    "after": {...},   -- État après modification  
    "changes": {...}, -- Delta des changements
    "file_size": 1024,
    "mime_type": "application/pdf"
  }
  */
  
  -- Contexte de l'action
  ip_address INET,
  user_agent TEXT,
  geo_location JSONB, -- {country, city, lat, lng}
  device_info JSONB,  -- {type, os, browser}
  
  -- Analyse de risque
  risk_score DECIMAL(3,2) DEFAULT 0.00 CHECK (risk_score >= 0 AND risk_score <= 1),
  is_suspicious BOOLEAN DEFAULT false,
  anomaly_reasons TEXT[], -- Raisons de l'anomalie détectée
  
  -- Blockchain-style immutability
  previous_hash TEXT, -- Hash du log précédent
  current_hash TEXT,  -- Hash de ce log (calculé automatiquement)
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes pour performance
CREATE INDEX idx_audit_logs_org_id ON audit_logs_immutable(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs_immutable(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs_immutable(created_at DESC);
CREATE INDEX idx_audit_logs_risk_score ON audit_logs_immutable(risk_score DESC);
CREATE INDEX idx_audit_logs_suspicious ON audit_logs_immutable(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_audit_logs_action ON audit_logs_immutable(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs_immutable(resource_type, resource_id);

-- ============================================================================
-- Table: ai_behavioral_profiles
-- Description: Profils comportementaux des utilisateurs pour détection d'anomalies
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_behavioral_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Métriques de base (calculées sur période d'apprentissage)
  baseline_metrics JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "avg_daily_actions": 45,
    "avg_file_downloads_per_day": 5,
    "typical_action_hours": ["09:00-12:00", "14:00-18:00"],
    "common_ip_ranges": ["192.168.1.0/24"],
    "common_devices": ["desktop"],
    "avg_session_duration_minutes": 120
  }
  */
  
  -- Anomalies récentes
  recent_anomalies JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {
      "detected_at": "2023-...",
      "type": "unusual_volume",
      "score": 0.85,
      "details": "Downloaded 500 files vs baseline 5"
    }
  ]
  */
  
  -- Scores d'anomalie actuels
  anomaly_scores JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "volume_score": 0.15,
    "timing_score": 0.05,
    "location_score": 0.00,
    "device_score": 0.00,
    "overall_score": 0.20
  }
  */
  
  -- Status
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  
  -- Apprentissage
  learning_period_days INTEGER DEFAULT 30,
  last_analyzed_at TIMESTAMPTZ,
  next_analysis_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_behavioral_profiles_user_id ON ai_behavioral_profiles(user_id);
CREATE INDEX idx_behavioral_profiles_is_blocked ON ai_behavioral_profiles(is_blocked);
CREATE INDEX idx_behavioral_profiles_next_analysis ON ai_behavioral_profiles(next_analysis_at);

-- ============================================================================
-- Table: dlp_rules (Data Leak Prevention)
-- Description: Règles de détection et prévention de fuite de données
-- ============================================================================
CREATE TABLE IF NOT EXISTS dlp_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'pii', 'financial', 'health', 'classified', etc.
  
  -- Pattern de détection
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('regex', 'keyword', 'ml_model')),
  pattern TEXT NOT NULL, -- Expression régulière ou liste de mots-clés
  
  -- Action à prendre
  action TEXT NOT NULL CHECK (action IN ('block', 'anonymize', 'alert', 'log')),
  
  -- Sévérité
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Configuration d'anonymisation
  anonymization_config JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "method": "mask",  // ou "hash", "redact", "tokenize"
    "mask_char": "*",
    "preserve_format": true
  }
  */
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Statistiques
  detection_count INTEGER DEFAULT 0,
  last_detection_at TIMESTAMPTZ,
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dlp_rules_org_id ON dlp_rules(organization_id);
CREATE INDEX idx_dlp_rules_is_active ON dlp_rules(is_active);
CREATE INDEX idx_dlp_rules_severity ON dlp_rules(severity);

-- ============================================================================
-- Table: dlp_violations
-- Description: Violations DLP détectées
-- ============================================================================
CREATE TABLE IF NOT EXISTS dlp_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES dlp_rules(id),
  
  -- Contexte
  user_id UUID NOT NULL REFERENCES auth.users(id),
  resource_id UUID,
  resource_type TEXT,
  
  -- Détails de la violation
  matched_content TEXT, -- Échantillon du contenu qui a matché
  context TEXT,         -- Contexte autour du match
  
  -- Action prise
  action_taken TEXT NOT NULL,
  
  -- Audit
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT
);

CREATE INDEX idx_dlp_violations_org_id ON dlp_violations(organization_id);
CREATE INDEX idx_dlp_violations_user_id ON dlp_violations(user_id);
CREATE INDEX idx_dlp_violations_detected_at ON dlp_violations(detected_at DESC);

-- ============================================================================
-- Table: shadow_archives (WORM - Write Once Read Many)
-- Description: Copies miroirs immuables pour conformité légale
-- ============================================================================
CREATE TABLE IF NOT EXISTS shadow_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Ressource originale
  original_resource_id UUID NOT NULL,
  original_resource_type TEXT NOT NULL,
  original_path TEXT,
  
  -- Données archivées (snapshot complet)
  archive_data JSONB NOT NULL,
  archive_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Checksum pour vérifier intégrité
  checksum TEXT NOT NULL,
  encryption_key_id UUID, -- Référence à une clé de chiffrement
  
  -- Règles de suppression
  retention_until TIMESTAMPTZ, -- Date jusqu'à laquelle l'archive doit être conservée
  deletion_requires_signatures INTEGER DEFAULT 2, -- Nombre de signatures requises
  deletion_signatures JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {"admin_id": "uuid", "signed_at": "timestamp", "reason": "Legal compliance"}
  ]
  */
  
  -- Status
  is_deletable BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  
  -- Audit
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Access log
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_shadow_archives_org_id ON shadow_archives(organization_id);
CREATE INDEX idx_shadow_archives_original ON shadow_archives(original_resource_id, original_resource_type);
CREATE INDEX idx_shadow_archives_archived_at ON shadow_archives(archived_at DESC);
CREATE INDEX idx_shadow_archives_retention ON shadow_archives(retention_until);

-- ============================================================================
-- Functions: Blockchain-style hashing pour immutabilité
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_blockchain_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_data_to_hash TEXT;
  v_previous_hash TEXT;
BEGIN
  -- Récupérer le hash du log précédent
  SELECT current_hash INTO v_previous_hash
  FROM audit_logs_immutable
  WHERE organization_id = NEW.organization_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Préparer les données à hasher
  v_data_to_hash := COALESCE(v_previous_hash, '') || 
                    NEW.id::TEXT ||
                    NEW.user_id::TEXT ||
                    NEW.action ||
                    NEW.resource_type ||
                    COALESCE(NEW.resource_id::TEXT, '') ||
                    NEW.created_at::TEXT;
  
  -- Calculer le hash
  NEW.previous_hash := v_previous_hash;
  NEW.current_hash := encode(digest(v_data_to_hash, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_immutability_audit_logs
  BEFORE INSERT ON audit_logs_immutable
  FOR EACH ROW
  EXECUTE FUNCTION calculate_blockchain_hash();

-- ============================================================================
-- Function: Empêcher UPDATE/DELETE sur audit_logs
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update_audit_logs
  BEFORE UPDATE ON audit_logs_immutable
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER prevent_delete_audit_logs
  BEFORE DELETE ON audit_logs_immutable
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- Function: Calculer le risk score d'une action
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_risk_score(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_metadata JSONB
) RETURNS DECIMAL AS $$
DECLARE
  v_risk_score DECIMAL := 0.0;
  v_profile RECORD;
  v_baseline_avg INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Récupérer le profil comportemental
  SELECT * INTO v_profile
  FROM ai_behavioral_profiles
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Pas de profil = comportement inconnu = risque moyen
    RETURN 0.5;
  END IF;
  
  -- Vérifier volume d'actions (exemple simple)
  IF p_action = 'download' THEN
    v_baseline_avg := COALESCE((v_profile.baseline_metrics->>'avg_file_downloads_per_day')::INTEGER, 5);
    
    -- Compter les downloads dans les dernières 24h
    SELECT COUNT(*) INTO v_current_count
    FROM audit_logs_immutable
    WHERE user_id = p_user_id
      AND action = 'download'
      AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Si 10x la baseline, score élevé
    IF v_current_count > v_baseline_avg * 10 THEN
      v_risk_score := 0.9;
    ELSIF v_current_count > v_baseline_avg * 5 THEN
      v_risk_score := 0.7;
    ELSIF v_current_count > v_baseline_avg * 2 THEN
      v_risk_score := 0.4;
    END IF;
  END IF;
  
  -- TODO: Ajouter d'autres heuristiques (horaires inhabituels, nouvelle IP, etc.)
  
  RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Scanner contenu pour DLP
-- ============================================================================
CREATE OR REPLACE FUNCTION scan_content_for_dlp(
  p_organization_id UUID,
  p_content TEXT,
  p_user_id UUID,
  p_resource_id UUID,
  p_resource_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
  v_violations JSONB := '[]'::jsonb;
  v_matched BOOLEAN;
BEGIN
  FOR v_rule IN
    SELECT * FROM dlp_rules
    WHERE organization_id = p_organization_id
      AND is_active = true
  LOOP
    v_matched := false;
    
    -- Vérification selon le type de pattern
    IF v_rule.pattern_type = 'regex' THEN
      v_matched := p_content ~ v_rule.pattern;
    ELSIF v_rule.pattern_type = 'keyword' THEN
      v_matched := p_content ILIKE '%' || v_rule.pattern || '%';
    END IF;
    
    IF v_matched THEN
      -- Enregistrer la violation
      INSERT INTO dlp_violations (
        organization_id, rule_id, user_id,
        resource_id, resource_type,
        matched_content, action_taken
      ) VALUES (
        p_organization_id, v_rule.id, p_user_id,
        p_resource_id, p_resource_type,
        substring(p_content, 1, 200), -- Échantillon
        v_rule.action
      );
      
      -- Incrémenter compteur
      UPDATE dlp_rules
      SET detection_count = detection_count + 1,
          last_detection_at = NOW()
      WHERE id = v_rule.id;
      
      -- Ajouter à la liste des violations
      v_violations := v_violations || jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', v_rule.name,
        'severity', v_rule.severity,
        'action', v_rule.action
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_violations', jsonb_array_length(v_violations) > 0,
    'violations', v_violations
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE audit_logs_immutable ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_behavioral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dlp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dlp_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_archives ENABLE ROW LEVEL SECURITY;

-- Audit Logs: Admins et auditeurs peuvent voir
CREATE POLICY "Admins and auditors can view audit logs"
  ON audit_logs_immutable FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = audit_logs_immutable.organization_id
        AND om.role IN ('owner', 'admin', 'auditor')
        AND om.is_active = true
    )
  );

-- DLP Rules: Admins peuvent gérer
CREATE POLICY "Admins can manage DLP rules"
  ON dlp_rules FOR ALL
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Shadow Archives: Admins et auditeurs peuvent consulter
CREATE POLICY "Admins can view shadow archives"
  ON shadow_archives FOR SELECT
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

COMMENT ON TABLE audit_logs_immutable IS 'Logs d''audit immuables avec blockchain-style hashing';
COMMENT ON TABLE ai_behavioral_profiles IS 'Profils comportementaux pour détection d''anomalies IA';
COMMENT ON TABLE dlp_rules IS 'Règles de Data Leak Prevention';
COMMENT ON TABLE shadow_archives IS 'Archives WORM (Write Once Read Many) pour conformité';
