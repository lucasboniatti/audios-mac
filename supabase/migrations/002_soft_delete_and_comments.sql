-- Migration 002: Soft Delete and Schema Comments
-- Created: 2026-03-15
-- Purpose: Add soft delete for audit trail and document schema

-- ============================================================================
-- SOFT DELETE: Add deleted_at column for audit trail
-- ============================================================================

-- Add deleted_at to transcriptions table
ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create partial index for soft delete (only non-deleted rows)
CREATE INDEX IF NOT EXISTS idx_transcriptions_not_deleted
ON transcriptions(deleted_at)
WHERE deleted_at IS NULL;

-- Add deleted_at to tags table
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tags_not_deleted
ON tags(deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================================
-- SCHEMA COMMENTS: Document tables and columns
-- ============================================================================

-- Table comments
COMMENT ON TABLE profiles IS 'Perfil do usuário com preferências e configurações';
COMMENT ON TABLE transcriptions IS 'Transcrições de áudio sincronizadas do app macOS. Suporta versionamento e soft delete.';
COMMENT ON TABLE tags IS 'Tags personalizadas para organizar transcrições. Suporta soft delete.';
COMMENT ON TABLE sync_conflicts IS 'Registro de conflitos de sincronização entre dispositivos';

-- Profiles column comments
COMMENT ON COLUMN profiles.id IS 'UUID do usuário, referência para auth.users';
COMMENT ON COLUMN profiles.email IS 'Email do usuário';
COMMENT ON COLUMN profiles.full_name IS 'Nome completo opcional';
COMMENT ON COLUMN profiles.avatar_url IS 'URL do avatar do usuário';
COMMENT ON COLUMN profiles.preferences IS 'JSON com preferências do usuário (tema, idioma, etc)';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp de criação do perfil';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp da última atualização';

-- Transcriptions column comments
COMMENT ON COLUMN transcriptions.id IS 'UUID único da transcrição';
COMMENT ON COLUMN transcriptions.user_id IS 'UUID do usuário dono';
COMMENT ON COLUMN transcriptions.local_id IS 'ID local do SQLite no dispositivo de origem';
COMMENT ON COLUMN transcriptions.text IS 'Texto transcrito do áudio';
COMMENT ON COLUMN transcriptions.timestamp IS 'Timestamp Unix da gravação original';
COMMENT ON COLUMN transcriptions.duration_seconds IS 'Duração do áudio em segundos';
COMMENT ON COLUMN transcriptions.is_favorite IS 'Se a transcrição está marcada como favorita';
COMMENT ON COLUMN transcriptions.version IS 'Versão para controle de conflitos';
COMMENT ON COLUMN transcriptions.created_at IS 'Timestamp de criação no cloud';
COMMENT ON COLUMN transcriptions.updated_at IS 'Timestamp da última atualização';
COMMENT ON COLUMN transcriptions.deleted_at IS 'Soft delete: NULL = ativo, timestamp = deletado';

-- Tags column comments
COMMENT ON COLUMN tags.id IS 'UUID único da tag';
COMMENT ON COLUMN tags.user_id IS 'UUID do usuário dono';
COMMENT ON COLUMN tags.name IS 'Nome da tag (único por usuário)';
COMMENT ON COLUMN tags.color IS 'Cor da tag em hex (ex: #FF5733)';
COMMENT ON COLUMN tags.created_at IS 'Timestamp de criação';
COMMENT ON COLUMN tags.updated_at IS 'Timestamp da última atualização';
COMMENT ON COLUMN tags.deleted_at IS 'Soft delete: NULL = ativo, timestamp = deletado';

-- Sync conflicts column comments
COMMENT ON COLUMN sync_conflicts.id IS 'UUID único do registro de conflito';
COMMENT ON COLUMN sync_conflicts.user_id IS 'UUID do usuário dono';
COMMENT ON COLUMN sync_conflicts.transcription_id IS 'UUID da transcrição em conflito';
COMMENT ON COLUMN sync_conflicts.local_version IS 'Versão local do dado';
COMMENT ON COLUMN sync_conflicts.remote_version IS 'Versão remota do dado';
COMMENT ON COLUMN sync_conflicts.local_payload IS 'Dados locais em JSON';
COMMENT ON COLUMN sync_conflicts.remote_payload IS 'Dados remotos em JSON';
COMMENT ON COLUMN sync_conflicts.resolved_at IS 'NULL = pendente, timestamp = resolvido';
COMMENT ON COLUMN sync_conflicts.resolution IS 'Como foi resolvido: local_wins, remote_wins, manual_merge';
COMMENT ON COLUMN sync_conflicts.created_at IS 'Timestamp de detecção do conflito';

-- ============================================================================
-- FUNCTIONS: Helper functions for soft delete
-- ============================================================================

-- Function to soft delete a transcription
CREATE OR REPLACE FUNCTION soft_delete_transcription(p_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transcriptions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_id AND user_id = p_user_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted transcription
CREATE OR REPLACE FUNCTION restore_transcription(p_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transcriptions
  SET deleted_at = NULL, updated_at = NOW()
  WHERE id = p_id AND user_id = p_user_id AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted records (for cleanup)
CREATE OR REPLACE FUNCTION purge_deleted_transcriptions(older_than_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM transcriptions
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - (older_than_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS: Active records view (excludes soft-deleted)
-- ============================================================================

-- View for active transcriptions (not deleted)
CREATE OR REPLACE VIEW active_transcriptions AS
SELECT *
FROM transcriptions
WHERE deleted_at IS NULL;

-- View for active tags (not deleted)
CREATE OR REPLACE VIEW active_tags AS
SELECT *
FROM tags
WHERE deleted_at IS NULL;

-- ============================================================================
-- UPDATE RLS POLICIES: Exclude soft-deleted from default queries
-- Note: Applications should use deleted_at IS NULL in their queries
-- ============================================================================