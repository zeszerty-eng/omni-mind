# Supabase Migrations - Noyau de Souveraineté

Ce dossier contient les migrations SQL pour le système de **Noyau de Souveraineté** d'OMNI-MIND.

## 📋 Migrations Disponibles

### 001 - Organizations Multi-Tenant
**Fichier**: `001_organizations_multi_tenant.sql`

Crée l'infrastructure multi-tenant de base:
- Table `organizations` pour gérer plusieurs administrations
- Table `organization_members` pour les membres et leurs rôles
- Table `organization_invitations` pour les invitations
- RLS policies pour isolation complète des données
- Functions utilitaires pour vérification des permissions

**Dépendances**: Aucune

---

### 002 - RBAC Granular System
**Fichier**: `002_rbac_granular_system.sql`

Système de contrôle d'accès ultra-granulaire:
- Table `access_policies` pour politiques contextuelles (IP, horaires, geo)
- Table `temporal_access_grants` pour Ghost Mode (accès temporaires)
- Table `invisible_resources` pour hiérarchie de visibilité
- Function `check_contextual_access()` pour vérification d'accès
- Auto-cleanup des accès expirés

**Dépendances**: 001

---

### 003 - Audit Surveillance AI
**Fichier**: `003_audit_surveillance_ai.sql`

Système d'audit et surveillance IA:
- Table `audit_logs_immutable` avec blockchain-style hashing
- Table `ai_behavioral_profiles` pour détection d'anomalies
- Table `dlp_rules` et `dlp_violations` pour Data Leak Prevention
- Table `shadow_archives` pour copies WORM
- Functions pour scoring de risque et scan DLP
- Triggers pour empêcher modification/suppression des logs

**Dépendances**: 001

---

### 004 - Emergency Actions Multi-Sig
**Fichier**: `004_emergency_actions_multisig.sql`

Système d'actions d'urgence avec validation multi-signature:
- Table `emergency_actions` pour Kill Switch avec workflow multi-sig
- Table `system_lockdowns` pour états de lockdown
- Table `encryption_key_management` pour gestion des clés
- Functions pour initier, confirmer et exécuter actions d'urgence
- Support air-gapped keys

**Dépendances**: 001

---

### 005 - Command Palette History
**Fichier**: `005_command_palette_history.sql`

Système de Command Palette pour admins:
- Table `admin_command_history` pour historique
- Table `command_templates` avec templates pré-configurés
- Table `admin_sessions` pour gestion des sessions admin
- Functions pour exécution et suggestions de commandes
- Seed data avec commandes système de base

**Dépendances**: 001

---

## 🚀 Application des Migrations

### Option 1: Via Dashboard Supabase (Recommandé)

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet: `xvnlbqlpsvudkcbclygg`
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de chaque migration **dans l'ordre**:
   - `001_organizations_multi_tenant.sql`
   - `002_rbac_granular_system.sql`
   - `003_audit_surveillance_ai.sql`
   - `004_emergency_actions_multisig.sql`
   - `005_command_palette_history.sql`
5. Exécuter chaque script via le bouton "Run"

### Option 2: Via Supabase CLI

Si vous avez installé le CLI Supabase:

```bash
# Initialiser Supabase (si pas déjà fait)
supabase init

# Lier au projet distant
supabase link --project-ref xvnlbqlpsvudkcbclygg

# Appliquer les migrations
supabase db push

# Ou appliquer une migration spécifique
supabase db execute -f supabase/migrations/001_organizations_multi_tenant.sql
```

### Option 3: Via psql (Avancé)

Si vous avez accès direct à PostgreSQL:

```bash
# Obtenir la connection string depuis Supabase Dashboard
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xvnlbqlpsvudkcbclygg.supabase.co:5432/postgres"

# Dans psql:
\i supabase/migrations/001_organizations_multi_tenant.sql
\i supabase/migrations/002_rbac_granular_system.sql
\i supabase/migrations/003_audit_surveillance_ai.sql
\i supabase/migrations/004_emergency_actions_multisig.sql
\i supabase/migrations/005_command_palette_history.sql
```

---

## ✅ Vérification Post-Migration

Après avoir appliqué toutes les migrations, vérifiez que tout est OK:

```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations',
    'organization_members',
    'access_policies',
    'temporal_access_grants',
    'audit_logs_immutable',
    'ai_behavioral_profiles',
    'dlp_rules',
    'shadow_archives',
    'emergency_actions',
    'system_lockdowns',
    'encryption_key_management',
    'admin_command_history',
    'command_templates'
  )
ORDER BY table_name;

-- Vérifier les RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Vérifier les functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_organization_admin',
    'check_contextual_access',
    'calculate_blockchain_hash',
    'calculate_risk_score',
    'initiate_emergency_action',
    'confirm_emergency_action',
    'execute_admin_command'
  )
ORDER BY routine_name;

-- Vérifier l'organisation par défaut
SELECT * FROM organizations WHERE slug = 'admin-principale';

-- Vérifier les command templates
SELECT name, category FROM command_templates WHERE is_system = true;
```

---

## 🔒 Considérations de Sécurité

1. **RLS Activé**: Toutes les tables sensibles ont Row Level Security activé
2. **Logs Immuables**: Les `audit_logs_immutable` ne peuvent PAS être modifiés ou supprimés
3. **Multi-Sig**: Les actions critiques nécessitent validation de 2+ admins
4. **Isolation**: Chaque organisation est complètement isolée des autres

---

## 🛠 Rollback

En cas de problème, vous pouvez rollback une migration:

```sql
-- Exemple: Rollback de la migration 005
DROP TABLE IF EXISTS admin_command_history CASCADE;
DROP TABLE IF EXISTS command_templates CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP FUNCTION IF EXISTS execute_admin_command CASCADE;
DROP FUNCTION IF EXISTS get_command_suggestions CASCADE;
```

**⚠️ ATTENTION**: Le rollback peut entraîner une perte de données. Toujours faire un backup avant.

---

## 📊 Statistiques de la Base

Après migration complète, vous aurez:
- **13 nouvelles tables** principales
- **8+ ENUM types** pour typage fort
- **15+ functions** PostgreSQL
- **30+ RLS policies** pour sécurité
- **9 command templates** par défaut

---

## 📝 Notes Importantes

1. **Extensions Requises**:
   - `uuid-ossp` (normalement déjà installée sur Supabase)
   - `pgcrypto` (pour hashing, normalement déjà installée)

2. **Performance**:
   - Tous les indexes critiques sont créés
   - Les policies RLS utilisent les indexes pour performance optimale

3. **Compatibilité**:
   - Compatible PostgreSQL 14+
   - Testé sur Supabase (PostgreSQL 15)

---

## 🆘 Support
 
En cas de problème durant la migration:
1. Vérifier les logs d'erreur SQL
2. Vérifier que les dépendances sont respectées (ordre des migrations)
3. S'assurer que l'extension `uuid-ossp` est activée

---

## 📅 Prochaines Étapes

Après application des migrations:
1. ✅ Créer la structure frontend `src/features/admin/sovereignty-core/`
2. ✅ Implémenter les hooks React pour interagir avec ces tables
3. ✅ Créer les composants UI pour le dashboard admin
4. ✅ Tester le workflow complet

---

**Dernière mise à jour**: 2025-12-19
**Version**: 1.0.0
**Auteur**: Équipe OMNI-MIND
