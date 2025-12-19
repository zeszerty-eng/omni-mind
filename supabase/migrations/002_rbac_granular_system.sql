-- Migration 002: RBAC Granular System with Contextual Access
-- Description: Système de contrôle d'accès basé sur les rôles (RBAC) ultra-granulaire
-- avec support de conditions contextuelles (IP, horaires, géolocalisation)

-- ============================================================================
-- ENUM Types
-- ============================================================================

CREATE TYPE access_action AS ENUM (
  'read', 'write', 'delete', 'share', 
  'admin', 'execute', 'download', 'upload'
);

CREATE TYPE visibility_level AS ENUM (
  'public',      -- Visible par tous dans l'organisation
  'restricted',  -- Visible seulement avec permissions
  'invisible',   -- Invisible jusqu'à double authentification
  'classified'   -- Nécessite validation multi-sig pour voir
);

CREATE TYPE mfa_level AS ENUM (
  'none',        -- Pas de MFA requis
  'standard',    -- MFA standard (TOTP)
  'biometric',   -- Biométrie requise
  'hardware'     -- Clé matérielle (Yubikey) requise
);

-- ============================================================================
-- Table: access_policies
-- Description: Politiques d'accès configurables avec conditions contextuelles
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0, -- Plus haut = prioritaire
  
  -- Conditions contextuelles (JSON flexible)
  conditions JSONB DEFAULT '{}'::jsonb,
  /* Exemples de conditions:
  {
    "ip_ranges": ["192.168.1.0/24", "10.0.0.0/8"],
    "time_windows": [
      {"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "start": "09:00", "end": "18:00"}
    ],
    "geo_locations": ["FR", "BE"],
    "device_types": ["desktop", "mobile"],
    "requires_vpn": true
  }
  */
  
  -- Ressources concernées (patterns ou IDs spécifiques)
  resource_patterns JSONB DEFAULT '[]'::jsonb,
  /* Exemples:
  [
    {"type": "folder", "path": "/salaires/*"},
    {"type": "file", "tags": ["confidential"]},
    {"type": "catalog", "id": "uuid"}
  ]
  */
  
  -- Actions autorisées
  allowed_actions access_action[] DEFAULT '{}',
  denied_actions access_action[] DEFAULT '{}',
  
  -- MFA requis
  required_mfa_level mfa_level DEFAULT 'none',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_policies_org_id ON access_policies(organization_id);
CREATE INDEX idx_access_policies_priority ON access_policies(priority DESC);
CREATE INDEX idx_access_policies_is_active ON access_policies(is_active);

-- ============================================================================
-- Table: user_policy_assignments
-- Description: Association utilisateurs/rôles <-> policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_policy_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES access_policies(id) ON DELETE CASCADE,
  
  -- Cible: soit un utilisateur, soit un rôle
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT, -- Référence au rôle dans organization_members
  
  -- Override de conditions (plus restrictif que la policy)
  override_conditions JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: soit user_id, soit role_name (pas les deux)
  CHECK (
    (user_id IS NOT NULL AND role_name IS NULL) OR
    (user_id IS NULL AND role_name IS NOT NULL)
  )
);

CREATE INDEX idx_user_policy_user_id ON user_policy_assignments(user_id);
CREATE INDEX idx_user_policy_role ON user_policy_assignments(role_name);

-- ============================================================================
-- Table: temporal_access_grants (Ghost Mode)
-- Description: Accès temporaires auto-destructibles
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporal_access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Bénéficiaire
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ressource concernée
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'folder', 'file', 'catalog', etc.
  
  -- Actions autorisées
  allowed_actions access_action[] NOT NULL,
  
  -- Temporalité
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Auto-destruction
  auto_destroy BOOLEAN DEFAULT true, -- Si true, supprime la ressource à expiration
  max_access_count INTEGER, -- Nombre max d'accès autorisés
  current_access_count INTEGER DEFAULT 0,
  
  -- Audit
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_temporal_grants_user_id ON temporal_access_grants(user_id);
CREATE INDEX idx_temporal_grants_expires_at ON temporal_access_grants(expires_at);
CREATE INDEX idx_temporal_grants_resource ON temporal_access_grants(resource_id, resource_type);

-- ============================================================================
-- Table: invisible_resources
-- Description: Hiérarchie de visibilité des ressources
-- ============================================================================
CREATE TABLE IF NOT EXISTS invisible_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Ressource
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  
  -- Niveau de visibilité
  visibility_level visibility_level NOT NULL DEFAULT 'public',
  
  -- MFA requis pour accès
  required_mfa_level mfa_level NOT NULL DEFAULT 'none',
  
  -- Liste d'utilisateurs qui peuvent voir (whitelist)
  authorized_users UUID[] DEFAULT '{}',
  
  -- Liste de rôles qui peuvent voir
  authorized_roles TEXT[] DEFAULT '{}',
  
  -- Audit de révélation
  revealed_to JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {"user_id": "uuid", "revealed_at": "timestamp", "mfa_verified": true}
  ]
  */
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resource_id, resource_type)
);

CREATE INDEX idx_invisible_resources_org_id ON invisible_resources(organization_id);
CREATE INDEX idx_invisible_resources_visibility ON invisible_resources(visibility_level);

-- ============================================================================
-- Function: Vérifier l'accès contextuel
-- ============================================================================
CREATE OR REPLACE FUNCTION check_contextual_access(
  p_user_id UUID,
  p_organization_id UUID,
  p_resource_id UUID,
  p_resource_type TEXT,
  p_action access_action,
  p_context JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{"allowed": false, "reason": "no_policy_matched"}'::jsonb;
  v_policy RECORD;
  v_temporal_grant RECORD;
  v_user_role TEXT;
BEGIN
  -- 1. Vérifier les accès temporaires (Ghost Mode)
  SELECT * INTO v_temporal_grant
  FROM temporal_access_grants
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND resource_id = p_resource_id
    AND resource_type = p_resource_type
    AND p_action = ANY(allowed_actions)
    AND NOW() < expires_at
    AND revoked_at IS NULL
    AND (max_access_count IS NULL OR current_access_count < max_access_count);
  
  IF FOUND THEN
    -- Incrémenter le compteur d'accès
    UPDATE temporal_access_grants
    SET current_access_count = current_access_count + 1,
        last_accessed_at = NOW()
    WHERE id = v_temporal_grant.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'temporal_grant',
      'grant_id', v_temporal_grant.id,
      'expires_at', v_temporal_grant.expires_at
    );
  END IF;
  
  -- 2. Récupérer le rôle de l'utilisateur dans l'organisation
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'not_organization_member'
    );
  END IF;
  
  -- 3. Vérifier les policies (par priorité descendante)
  FOR v_policy IN
    SELECT ap.*, upa.override_conditions
    FROM access_policies ap
    LEFT JOIN user_policy_assignments upa ON upa.policy_id = ap.id
    WHERE ap.organization_id = p_organization_id
      AND ap.is_active = true
      AND (ap.valid_from IS NULL OR ap.valid_from <= NOW())
      AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
      AND (
        upa.user_id = p_user_id OR
        upa.role_name = v_user_role
      )
    ORDER BY ap.priority DESC
  LOOP
    -- Vérifier si l'action est explicitement refusée
    IF p_action = ANY(v_policy.denied_actions) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'action_denied',
        'policy_id', v_policy.id,
        'policy_name', v_policy.name
      );
    END IF;
    
    -- Vérifier si l'action est autorisée
    IF p_action = ANY(v_policy.allowed_actions) THEN
      -- TODO: Vérifier les conditions contextuelles (IP, horaires, etc.)
      -- Pour l'instant, on accepte si l'action est dans allowed_actions
      
      RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'policy_matched',
        'policy_id', v_policy.id,
        'policy_name', v_policy.name,
        'required_mfa', v_policy.required_mfa_level
      );
    END IF;
  END LOOP;
  
  -- 4. Accès par défaut selon le rôle
  IF v_user_role IN ('owner', 'admin') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'admin_override'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Cleanup des accès temporaires expirés
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_temporal_grants()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Marquer comme révoqués (soft delete)
  UPDATE temporal_access_grants
  SET revoked_at = NOW(),
      revoked_by = granted_by -- Auto-revoke
  WHERE expires_at < NOW()
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- TODO: Si auto_destroy = true, supprimer les ressources
  -- (nécessite intégration avec le système de fichiers)
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Auto-cleanup périodique (via pg_cron si disponible)
-- ============================================================================
-- Note: Nécessite l'extension pg_cron
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-expired-grants', '*/5 * * * *', 'SELECT cleanup_expired_temporal_grants()');

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invisible_resources ENABLE ROW LEVEL SECURITY;

-- Access Policies: Seuls les admins peuvent voir/gérer
CREATE POLICY "Org admins can manage access policies"
  ON access_policies FOR ALL
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Temporal Grants: Users voient leurs propres grants
CREATE POLICY "Users can view their temporal grants"
  ON temporal_access_grants FOR SELECT
  USING (user_id = auth.uid());

-- Temporal Grants: Admins peuvent tout gérer
CREATE POLICY "Org admins can manage temporal grants"
  ON temporal_access_grants FOR ALL
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

COMMENT ON TABLE access_policies IS 'Politiques d''accès configurables avec conditions contextuelles';
COMMENT ON TABLE temporal_access_grants IS 'Accès temporaires auto-destructibles (Ghost Mode)';
COMMENT ON TABLE invisible_resources IS 'Hiérarchie de visibilité des ressources';
COMMENT ON FUNCTION check_contextual_access IS 'Vérifie si un utilisateur a accès à une ressource dans un contexte donné';
