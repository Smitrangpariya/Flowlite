-- ============================================================================
-- V2__performance_indexes.sql
-- FlowLite — Additional composite indexes for query performance
-- ============================================================================

CREATE INDEX idx_notif_recipient_read ON notifications(recipient_id, `read`);
CREATE INDEX idx_task_org_status      ON tasks(board_id, status, deleted_at);
CREATE INDEX idx_audit_entity_time    ON audit_logs(entity, timestamp);
CREATE INDEX idx_revoked_expires      ON revoked_tokens(expires_at);
