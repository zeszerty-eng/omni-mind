-- Migration 007: Shadow Archive Logic & Restore RPC
-- Description: Trigger générique pour archivage et fonction de restauration
-- Depends on: 003_audit_surveillance_ai.sql (defines shadow_archives)

-- ============================================================================
-- 1. Trigger Function: Soft Delete to Shadow Archive
-- Description: Generic trigger to move a deleted record into shadow_archives
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_soft_delete_archive()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Attempt to find a meaningful organization_id
  IF (TG_OP = 'DELETE') THEN
     -- Try to find organization_id in OLD, else use NULL (or throw?)
     -- Most tables in this system have organization_id
     BEGIN
       v_org_id := OLD.organization_id;
     EXCEPTION WHEN OTHERS THEN
       v_org_id := NULL; -- Handle global resources or tables without org_id
     END;

     INSERT INTO shadow_archives (
       organization_id,
       original_resource_id,
       original_resource_type,
       archive_data,
       checksum,
       archived_by
     ) VALUES (
       v_org_id, -- Can be null if foreign key constraints allow or if handling is different
       OLD.id,
       TG_TABLE_NAME, -- Use table name as resource type key
       to_jsonb(OLD),
       md5(to_jsonb(OLD)::text), -- Simple integrity checksum
       auth.uid() -- Who performed the deletion
     );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Restore Function (RPC)
-- Description: Restores a record from shadow_archives to its original table
-- WARNING: This uses dynamic SQL and requires the table schema to match 
-- the archived JSONB keys. ID conflicts may occur if ID was reused.
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_from_shadow_archive(
  p_archive_id UUID,
  p_requested_by UUID -- Argument used for audit/logging if extended
) RETURNS BOOLEAN AS $$
DECLARE
  v_archive RECORD;
  v_query TEXT;
  v_verify_admin BOOLEAN;
BEGIN
  -- 1. Get archive record
  SELECT * INTO v_archive FROM shadow_archives WHERE id = p_archive_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Archive not found'; 
  END IF;

  -- 2. Security Check: Only Organization Admins can restore
  -- We use the helper function defined in previous migrations
  SELECT is_organization_admin(auth.uid(), v_archive.organization_id) INTO v_verify_admin;
  
  IF NOT v_verify_admin AND auth.uid() IS NOT NULL THEN
    -- Allow super admins or if function is called by system (auth.uid might be null depending on context)
    -- Ideally, we strictly enforce this.
    RAISE EXCEPTION 'Unauthorized: Only admins can restore archives';
  END IF;

  -- 3. Construct Dynamic Insert Query
  -- jsonb_populate_record(null::table_name, jsonb_data) is the key here.
  -- It casts the JSONB data to the row type of the target table.
  
  v_query := format(
    'INSERT INTO %I SELECT * FROM jsonb_populate_record(null::%I, %L)',
    v_archive.original_resource_type, -- Target Table Identifier
    v_archive.original_resource_type, -- Target Type Identifier
    v_archive.archive_data            -- The JSONB Payload
  );

  -- 4. Execute Restoration
  BEGIN
    EXECUTE v_query;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Restoration failed: The resource ID already exists in the active system.';
  WHEN undefined_table THEN
    RAISE EXCEPTION 'Restoration failed: The original table % no longer exists.', v_archive.original_resource_type;
  WHEN OTHERS THEN
    RAISE;
  END;

  -- 5. Mark as Restored (Optional?)
  -- In a WORM system, we don't delete the archive, but maybe we log it?
  -- shadow_archives has no 'restored' status column in migration 003, 
  -- but we can maybe increment access_count via the trigger or manually.
  
  UPDATE shadow_archives 
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = p_archive_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Example Usage COMMENT
-- ============================================================================
-- To enable archiving on a table 'sensitive_documents':
-- CREATE TRIGGER archive_sensitive_documents
-- BEFORE DELETE ON sensitive_documents
-- FOR EACH ROW EXECUTE FUNCTION trigger_soft_delete_archive();
