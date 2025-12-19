-- Migration 004: Emergency Actions & Multi-Signature System
-- Description: Système d'actions d'urgence avec validation multi-signature (Kill Switch)

-- ============================================================================
-- ENUM Types
-- ============================================================================
CREATE TYPE emergency_action_type AS ENUM (
  'freeze_all',           -- Gèle tous les accès
  'revoke_all_sessions',  -- Déconnexion massive
  'lockdown',             -- Gel + Déconnexion + Blocage nouvelles connexions
  'destroy_keys',         -- Destruction des clés de chiffrement
  'isolate_user',         -- Isoler un utilisateur spécifique
  'freeze_resource'       -- Geler une ressource spécifique
);

CREATE TYPE emergency_status AS ENUM (
  'pending',    -- En attente de confirmations
  'confirmed',  -- Toutes les confirmations reçues
  'executing',  -- En cours d'exécution
  'executed',   -- Exécutée avec succès
  'failed',     -- Échec d'exécution
  'cancelled'   -- Annulée
);

CREATE TYPE lockdown_level AS ENUM (
  'freeze',    -- Gel des modifications, lecture autorisée
  'lockdown',  -- Blocage total, sessions actives révoquées
  'total'      -- Destruction des clés, système irrécupérable sans backup
);

-- ============================================================================
-- Table: emergency_actions
-- Description: Actions d'urgence nécessitant validation multi-signature
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type d'action
  action_type emergency_action_type NOT NULL,
  
  -- Cible de l'action (optionnel selon le type)
  target_user_id UUID REFERENCES auth.users(id),
  target_resource_id UUID,
  target_resource_type TEXT,
  
  -- Description et raison
  reason TEXT NOT NULL,
  additional_context JSONB DEFAULT '{}'::jsonb,
  
  -- Multi-signature
  requires_confirmations INTEGER DEFAULT 2,
  confirmations JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {
      "admin_id": "uuid",
      "admin_email": "email@example.com",
      "confirmed_at": "2023-...",
      "ip_address": "192.168.1.1",
      "mfa_verified": true
    }
  ]
  */
  
  -- Status
  status emergency_status DEFAULT 'pending',
  
  -- Exécution
  execution_started_at TIMESTAMPTZ,
  execution_completed_at TIMESTAMPTZ,
  execution_error TEXT,
  execution_result JSONB,
  
  -- Annulation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  
  -- Expiration (si pas confirmé dans les X minutes)
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes',
  
  -- Audit
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_actions_org_id ON emergency_actions(organization_id);
CREATE INDEX idx_emergency_actions_status ON emergency_actions(status);
CREATE INDEX idx_emergency_actions_expires_at ON emergency_actions(expires_at);
CREATE INDEX idx_emergency_actions_initiated_by ON emergency_actions(initiated_by);

-- ============================================================================
-- Table: system_lockdowns
-- Description: États de lockdown actifs par organisation
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_lockdowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  emergency_action_id UUID REFERENCES emergency_actions(id),
  
  -- Niveau de lockdown
  level lockdown_level NOT NULL,
  
  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,
  /* Exemples:
  {
    "allow_read": false,
    "allow_admin_access": true,
    "blocked_actions": ["write", "delete", "share"],
    "whitelist_users": ["uuid1", "uuid2"]
  }
  */
  
  -- Levée du lockdown
  can_be_lifted_by UUID[], -- Liste des admin IDs autorisés à lever
  lift_requires_signatures INTEGER DEFAULT 2,
  lift_confirmations JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  activated_by UUID NOT NULL REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Une seule lockdown active par organisation
  UNIQUE(organization_id) WHERE is_active = true
);

CREATE INDEX idx_system_lockdowns_org_id ON system_lockdowns(organization_id);
CREATE INDEX idx_system_lockdowns_is_active ON system_lockdowns(is_active);

-- ============================================================================
-- Table: encryption_key_management
-- Description: Gestion des clés de chiffrement avec support air-gapped
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_key_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type de clé
  key_type TEXT NOT NULL CHECK (key_type IN ('master', 'data', 'session', 'backup')),
  key_name TEXT NOT NULL,
  
  -- La clé elle-même n'est PAS stockée ici en clair
  -- Seulement son identifiant et métadonnées
  key_id TEXT NOT NULL UNIQUE, -- Identifiant externe (ex: KMS key ID)
  
  -- Air-gapped storage
  is_air_gapped BOOLEAN DEFAULT false,
  air_gap_location TEXT, -- Description de l'emplacement offline
  
  -- Backup locations
  backup_locations JSONB DEFAULT '[]'::jsonb,
  /* Format:
  [
    {
      "type": "hardware_device",
      "location": "Safe #3, Floor 2",
      "responsible": "John Doe",
      "last_verified": "2023-..."
    }
  ]
  */
  
  -- Rotation
  rotation_frequency_days INTEGER DEFAULT 90,
  last_rotated_at TIMESTAMPTZ DEFAULT NOW(),
  next_rotation_at TIMESTAMPTZ,
  
  -- Destruction
  destroyed_at TIMESTAMPTZ,
  destroyed_by UUID REFERENCES auth.users(id),
  destruction_method TEXT,
  destruction_verified_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encryption_keys_org_id ON encryption_key_management(organization_id);
CREATE INDEX idx_encryption_keys_key_type ON encryption_key_management(key_type);
CREATE INDEX idx_encryption_keys_destroyed ON encryption_key_management(destroyed_at);

-- ============================================================================
-- Table: emergency_contacts
-- Description: Contacts à notifier en cas d'urgence
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contact
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  
  -- Canaux de notification
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  
  -- Priority
  priority INTEGER DEFAULT 1, -- 1 = highest
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_org_id ON emergency_contacts(organization_id);

-- ============================================================================
-- Function: Initier une action d'urgence
-- ============================================================================
CREATE OR REPLACE FUNCTION initiate_emergency_action(
  p_organization_id UUID,
  p_action_type emergency_action_type,
  p_reason TEXT,
  p_initiated_by UUID,
  p_requires_multi_sig BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_required_confirmations INTEGER;
BEGIN
  -- Déterminer le nombre de confirmations requises
  v_required_confirmations := CASE
    WHEN p_requires_multi_sig THEN 2
    ELSE 0
  END;
  
  -- Créer l'action
  INSERT INTO emergency_actions (
    organization_id,
    action_type,
    reason,
    requires_confirmations,
    initiated_by
  ) VALUES (
    p_organization_id,
    p_action_type,
    p_reason,
    v_required_confirmations,
    p_initiated_by
  ) RETURNING id INTO v_action_id;
  
  -- Si multi-sig requis, ajouter la première confirmation automatiquement
  IF p_requires_multi_sig THEN
    PERFORM confirm_emergency_action(v_action_id, p_initiated_by);
  ELSE
    -- Exécuter immédiatement si pas de multi-sig
    PERFORM execute_emergency_action(v_action_id);
  END IF;
  
  -- TODO: Notifier les autres admins
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Confirmer une action d'urgence
-- ============================================================================
CREATE OR REPLACE FUNCTION confirm_emergency_action(
  p_action_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_action RECORD;
  v_new_confirmations JSONB;
  v_confirmation_count INTEGER;
BEGIN
  -- Récupérer l'action
  SELECT * INTO v_action
  FROM emergency_actions
  WHERE id = p_action_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency action not found';
  END IF;
  
  -- Vérifier statut
  IF v_action.status != 'pending' THEN
    RAISE EXCEPTION 'Emergency action is not pending';
  END IF;
  
  -- Vérifier expiration
  IF v_action.expires_at < NOW() THEN
    UPDATE emergency_actions
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = 'Expired without sufficient confirmations'
    WHERE id = p_action_id;
    
    RAISE EXCEPTION 'Emergency action has expired';
  END IF;
  
  -- Ajouter la confirmation
  v_new_confirmations := v_action.confirmations || jsonb_build_object(
    'admin_id', p_admin_id,
    'confirmed_at', NOW(),
    'ip_address', current_setting('request.headers', true)::json->>'x-real-ip'
  );
  
  UPDATE emergency_actions
  SET confirmations = v_new_confirmations
  WHERE id = p_action_id;
  
  -- Compter les confirmations
  v_confirmation_count := jsonb_array_length(v_new_confirmations);
  
  -- Si suffisamment de confirmations, exécuter
  IF v_confirmation_count >= v_action.requires_confirmations THEN
    UPDATE emergency_actions
    SET status = 'confirmed'
    WHERE id = p_action_id;
    
    PERFORM execute_emergency_action(p_action_id);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Exécuter une action d'urgence
-- ============================================================================
CREATE OR REPLACE FUNCTION execute_emergency_action(
  p_action_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_action RECORD;
BEGIN
  -- Récupérer l'action
  SELECT * INTO v_action
  FROM emergency_actions
  WHERE id = p_action_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency action not found';
  END IF;
  
  -- Marquer comme en cours d'exécution
  UPDATE emergency_actions
  SET status = 'executing',
      execution_started_at = NOW()
  WHERE id = p_action_id;
  
  -- Exécuter selon le type
  BEGIN
    CASE v_action.action_type
      WHEN 'freeze_all' THEN
        -- Créer un lockdown freeze
        INSERT INTO system_lockdowns (
          organization_id,
          emergency_action_id,
          level,
          activated_by
        ) VALUES (
          v_action.organization_id,
          p_action_id,
          'freeze',
          v_action.initiated_by
        );
        
      WHEN 'lockdown' THEN
        -- Créer un lockdown total
        INSERT INTO system_lockdowns (
          organization_id,
          emergency_action_id,
          level,
          activated_by
        ) VALUES (
          v_action.organization_id,
          p_action_id,
          'lockdown',
          v_action.initiated_by
        );
        
      WHEN 'revoke_all_sessions' THEN
        -- TODO: Révoquer toutes les sessions actives
        -- Nécessite intégration avec auth.sessions ou équivalent
        
      WHEN 'destroy_keys' THEN
        -- Marquer les clés comme détruites
        UPDATE encryption_key_management
        SET destroyed_at = NOW(),
            destroyed_by = v_action.initiated_by,
            destruction_method = 'Emergency action'
        WHERE organization_id = v_action.organization_id
          AND destroyed_at IS NULL;
        
      ELSE
        RAISE EXCEPTION 'Unknown emergency action type';
    END CASE;
    
    -- Marquer comme exécutée
    UPDATE emergency_actions
    SET status = 'executed',
        execution_completed_at = NOW(),
        execution_result = jsonb_build_object('success', true)
    WHERE id = p_action_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Marquer comme échec
    UPDATE emergency_actions
    SET status = 'failed',
        execution_completed_at = NOW(),
        execution_error = SQLERRM
    WHERE id = p_action_id;
    
    RAISE;
  END;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Vérifier si organisation est en lockdown
-- ============================================================================
CREATE OR REPLACE FUNCTION is_organization_locked_down(
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_lockdown RECORD;
BEGIN
  SELECT * INTO v_lockdown
  FROM system_lockdowns
  WHERE organization_id = p_organization_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_locked', false
    );
  END IF;
  
  RETURN jsonb_build_object(
    'is_locked', true,
    'level', v_lockdown.level,
    'activated_at', v_lockdown.activated_at,
    'config', v_lockdown.config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_lockdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_key_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Emergency Actions: Admins peuvent voir et gérer
CREATE POLICY "Admins can manage emergency actions"
  ON emergency_actions FOR ALL
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Lockdowns: Admins peuvent voir
CREATE POLICY "Admins can view lockdowns"
  ON system_lockdowns FOR SELECT
  USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Encryption Keys: Super admins seulement
CREATE POLICY "Owners can view encryption keys"
  ON encryption_key_management FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND organization_id = encryption_key_management.organization_id
        AND role = 'owner'
        AND is_active = true
    )
  );

COMMENT ON TABLE emergency_actions IS 'Actions d''urgence avec validation multi-signature';
COMMENT ON TABLE system_lockdowns IS 'États de lockdown actifs par organisation';
COMMENT ON TABLE encryption_key_management IS 'Gestion des clés de chiffrement';
COMMENT ON FUNCTION initiate_emergency_action IS 'Initier une action d''urgence';
COMMENT ON FUNCTION confirm_emergency_action IS 'Confirmer une action d''urgence (multi-sig)';
COMMENT ON FUNCTION execute_emergency_action IS 'Exécuter une action d''urgence confirmée';
