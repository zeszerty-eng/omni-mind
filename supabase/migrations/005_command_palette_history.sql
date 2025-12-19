-- Migration 005: Command Palette & Admin History
-- Description: Système de Command Palette avec historique des commandes admin

-- ============================================================================
-- Table: admin_command_history
-- Description: Historique de toutes les commandes exécutées via Command Palette
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_command_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Administrateur
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Commande
  command_raw TEXT NOT NULL, -- Commande brute tapée
  command_parsed JSONB, -- Commande parsée
  /* Format:
  {
    "action": "revoke_access",
    "target_user": "@user_email",
    "parameters": {
      "duration": "1h"
    }
  }
  */
  
  -- Exécution
  execution_status TEXT NOT NULL CHECK (execution_status IN ('pending', 'success', 'error', 'cancelled')),
  execution_result JSONB,
  execution_error TEXT,
  execution_duration_ms INTEGER,
  
  -- Contexte
  ip_address INET,
  user_agent TEXT,
  
  -- Audit
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_command_history_org_id ON admin_command_history(organization_id);
CREATE INDEX idx_command_history_admin_id ON admin_command_history(admin_id);
CREATE INDEX idx_command_history_executed_at ON admin_command_history(executed_at DESC);
CREATE INDEX idx_command_history_status ON admin_command_history(execution_status);

-- ============================================================================
-- Table: command_templates
-- Description: Templates de commandes pré-configurées
-- ============================================================================
CREATE TABLE IF NOT EXISTS command_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL, -- Template avec placeholders: "revoke access @{user} --duration {time}"
  
  -- Catégorie
  category TEXT NOT NULL, -- 'access', 'security', 'audit', 'admin'
  
  -- Configuration
  parameters JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {
      "name": "user",
      "type": "user_email",
      "required": true,
      "description": "Email de l'utilisateur"
    },
    {
      "name": "time",
      "type": "duration",
      "required": true,
      "default": "1h"
    }
  ]
  */
  
  -- Permissions requises pour utiliser
  required_role TEXT, -- 'owner', 'admin', etc.
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Si true, créé par le système (non modifiable)
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_command_templates_org_id ON command_templates(organization_id);
CREATE INDEX idx_command_templates_category ON command_templates(category);
CREATE INDEX idx_command_templates_is_active ON command_templates(is_active);

-- ============================================================================
-- Table: admin_sessions
-- Description: Sessions d'administration avec timeout
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Session
  session_token TEXT NOT NULL UNIQUE,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  geo_location JSONB,
  
  -- MFA
  mfa_verified BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMPTZ,
  
  -- Timeout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '8 hours',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_is_active ON admin_sessions(is_active);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ============================================================================
-- Function: Parse et exécute une commande
-- ============================================================================
CREATE OR REPLACE FUNCTION execute_admin_command(
  p_admin_id UUID,
  p_organization_id UUID,
  p_command TEXT
) RETURNS UUID AS $$
DECLARE
  v_command_id UUID;
  v_parsed JSONB;
  v_result JSONB;
  v_start_time TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Créer l'entrée d'historique
  INSERT INTO admin_command_history (
    organization_id,
    admin_id,
    command_raw,
    execution_status
  ) VALUES (
    p_organization_id,
    p_admin_id,
    p_command,
    'pending'
  ) RETURNING id INTO v_command_id;
  
  -- Parser la commande (logique simplifiée)
  v_parsed := jsonb_build_object(
    'raw', p_command,
    'parsed_at', NOW()
  );
  
  -- TODO: Implémenter le parser complet et l'exécuteur
  -- Pour l'instant, on simule juste
  
  BEGIN
    -- Simuler exécution
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Command parsed successfully'
    );
    
    -- Mettre à jour avec succès
    UPDATE admin_command_history
    SET command_parsed = v_parsed,
        execution_status = 'success',
        execution_result = v_result,
        execution_duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
    WHERE id = v_command_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Mettre à jour avec erreur
    UPDATE admin_command_history
    SET execution_status = 'error',
        execution_error = SQLERRM,
        execution_duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
    WHERE id = v_command_id;
    
    RAISE;
  END;
  
  RETURN v_command_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Obtenir les suggestions de commandes
-- ============================================================================
CREATE OR REPLACE FUNCTION get_command_suggestions(
  p_organization_id UUID,
  p_admin_id UUID,
  p_partial_command TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
  v_suggestions JSONB := '[]'::jsonb;
  v_template RECORD;
  v_admin_role TEXT;
BEGIN
  -- Récupérer le rôle de l'admin
  SELECT role INTO v_admin_role
  FROM organization_members
  WHERE user_id = p_admin_id
    AND organization_id = p_organization_id
    AND is_active = true;
  
  -- Récupérer les templates applicables
  FOR v_template IN
    SELECT *
    FROM command_templates
    WHERE (organization_id = p_organization_id OR organization_id IS NULL)
      AND is_active = true
      AND (required_role IS NULL OR required_role = v_admin_role OR v_admin_role = 'owner')
      AND (p_partial_command = '' OR template ILIKE '%' || p_partial_command || '%')
    ORDER BY usage_count DESC, name
    LIMIT 10
  LOOP
    v_suggestions := v_suggestions || jsonb_build_object(
      'id', v_template.id,
      'name', v_template.name,
      'template', v_template.template,
      'description', v_template.description,
      'category', v_template.category,
      'parameters', v_template.parameters
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'suggestions', v_suggestions,
    'count', jsonb_array_length(v_suggestions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Seed Data: Command Templates par défaut
-- ============================================================================
INSERT INTO command_templates (name, description, template, category, parameters, is_system)
VALUES
  -- Accès
  (
    'Révoquer accès utilisateur',
    'Révoque l''accès d''un utilisateur pendant une durée spécifiée',
    'revoke access @{user} --duration {time}',
    'access',
    '[
      {"name": "user", "type": "user_email", "required": true, "description": "Email de l''utilisateur"},
      {"name": "time", "type": "duration", "required": true, "default": "1h", "description": "Durée (ex: 1h, 30m, 1d)"}
    ]'::jsonb,
    true
  ),
  (
    'Accorder rôle temporaire',
    'Donne un rôle à un utilisateur pour une durée limitée',
    'grant role @{user} --role {role} --temporary {duration}',
    'access',
    '[
      {"name": "user", "type": "user_email", "required": true},
      {"name": "role", "type": "role_name", "required": true},
      {"name": "duration", "type": "duration", "required": true, "default": "24h"}
    ]'::jsonb,
    true
  ),
  (
    'Isoler dossier',
    'Isole un dossier de tous sauf utilisateurs spécifiés',
    'isolate folder /{path} from all users except @{user}',
    'access',
    '[
      {"name": "path", "type": "folder_path", "required": true},
      {"name": "user", "type": "user_email", "required": true}
    ]'::jsonb,
    true
  ),
  
  -- Sécurité
  (
    'Re-chiffrer les nœuds',
    'Force le re-chiffrement de tous les nœuds',
    'encrypt-rekey --all-nodes',
    'security',
    '[]'::jsonb,
    true
  ),
  (
    'Geler organisation',
    'Gèle toutes les actions dans une organisation',
    'freeze organization @{org}',
    'security',
    '[
      {"name": "org", "type": "organization", "required": false, "description": "Organisation (défaut: courante)"}
    ]'::jsonb,
    true
  ),
  (
    'Lockdown système',
    'Active le lockdown avec niveau spécifié',
    'lockdown --level {level}',
    'security',
    '[
      {"name": "level", "type": "enum", "required": true, "options": ["freeze", "lockdown", "total"]}
    ]'::jsonb,
    true
  ),
  
  -- Audit
  (
    'Générer rapport audit',
    'Génère un rapport d''audit pour une période',
    'generate audit-report --last-{time} --format {format}',
    'audit',
    '[
      {"name": "time", "type": "duration", "required": true, "default": "24h"},
      {"name": "format", "type": "enum", "required": true, "default": "pdf", "options": ["pdf", "csv", "json"]}
    ]'::jsonb,
    true
  ),
  (
    'Analyser comportement',
    'Analyse le comportement d''un utilisateur',
    'analyze behavior @{user}',
    'audit',
    '[
      {"name": "user", "type": "user_email", "required": true}
    ]'::jsonb,
    true
  ),
  (
    'Exporter logs',
    'Exporte les logs pour une organisation et période',
    'export logs --organization @{org} --date-range {range}',
    'audit',
    '[
      {"name": "org", "type": "organization", "required": false},
      {"name": "range", "type": "date_range", "required": true, "default": "last-7d"}
    ]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE admin_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Command History: Admins voient l'historique de leur org
CREATE POLICY "Admins can view command history"
  ON admin_command_history FOR SELECT
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Command History: Admins peuvent exécuter des commandes
CREATE POLICY "Admins can execute commands"
  ON admin_command_history FOR INSERT
  WITH CHECK (
    is_organization_admin(auth.uid(), organization_id)
    AND admin_id = auth.uid()
  );

-- Command Templates: Tous les membres voient les templates
CREATE POLICY "Members can view command templates"
  ON command_templates FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admin Sessions: Users voient leurs propres sessions
CREATE POLICY "Users can view their admin sessions"
  ON admin_sessions FOR SELECT
  USING (admin_id = auth.uid());

COMMENT ON TABLE admin_command_history IS 'Historique des commandes Command Palette';
COMMENT ON TABLE command_templates IS 'Templates de commandes pré-configurées';
COMMENT ON TABLE admin_sessions IS 'Sessions d''administration avec timeout';
COMMENT ON FUNCTION execute_admin_command IS 'Parse et exécute une commande admin';
COMMENT ON FUNCTION get_command_suggestions IS 'Obtient des suggestions de commandes';
