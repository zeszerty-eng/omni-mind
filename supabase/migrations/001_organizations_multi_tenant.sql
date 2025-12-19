-- Migration 001: Organizations Multi-Tenant Support
-- Description: Crée la structure pour supporter plusieurs organisations/administrations
-- avec isolation complète des données

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: organizations
-- Description: Représente chaque administration/organisation utilisant le système
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Configuration JSON flexible par organisation
  settings JSONB DEFAULT '{
    "features": {
      "ai_surveillance": true,
      "ghost_mode": true,
      "dlp": true,
      "shadow_archives": true,
      "command_palette": true
    },
    "security": {
      "mfa_required": false,
      "session_timeout_minutes": 480,
      "max_failed_login_attempts": 5
    },
    "audit": {
      "retention_days": 365,
      "immutable_logs": true
    }
  }'::jsonb,
  
  -- Métadonnées
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- ============================================================================
-- Table: organization_members
-- Description: Association utilisateurs <-> organisations avec rôles
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rôle dans l'organisation
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'guest')),
  
  -- Permissions custom (override du rôle)
  custom_permissions JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: un user ne peut avoir qu'un rôle par organisation
  UNIQUE(organization_id, user_id)
);

-- Index
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- ============================================================================
-- Table: organization_invitations
-- Description: Invitations pendantes pour rejoindre une organisation
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  
  -- Token sécurisé pour l'invitation
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
  
  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  
  -- Status
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_expires_at ON organization_invitations(expires_at);

-- ============================================================================
-- Function: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour auto-update des timestamps
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: Les utilisateurs ne voient que leurs organisations
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Organizations: Seuls les owners peuvent modifier
CREATE POLICY "Organization owners can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() 
        AND role = 'owner' 
        AND is_active = true
    )
  );

-- Organization Members: Voir les membres de son organisation
CREATE POLICY "View organization members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Organization Members: Admins+ peuvent gérer les membres
CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Invitations: Voir les invitations de son org
CREATE POLICY "View organization invitations"
  ON organization_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- Functions utilitaires
-- ============================================================================

-- Function: Vérifier si un user est admin d'une organisation
CREATE OR REPLACE FUNCTION is_organization_admin(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Obtenir l'organisation actuelle d'un user (la première active)
CREATE OR REPLACE FUNCTION get_user_current_organization(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM organization_members
    WHERE user_id = p_user_id AND is_active = true
    ORDER BY joined_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Seed Data: Organisation par défaut (optionnel)
-- ============================================================================

-- Créer une organisation par défaut pour le développement
INSERT INTO organizations (name, slug, description)
VALUES (
  'Administration Principale',
  'admin-principale',
  'Organisation par défaut du système OMNI-MIND'
) ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE organizations IS 'Organisations/Administrations utilisant le système';
COMMENT ON TABLE organization_members IS 'Membres et leurs rôles dans chaque organisation';
COMMENT ON TABLE organization_invitations IS 'Invitations pendantes pour rejoindre des organisations';
