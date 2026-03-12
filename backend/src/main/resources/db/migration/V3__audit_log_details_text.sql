-- V3: Change audit_logs.details from VARCHAR(255) to TEXT
-- Prevents data truncation for detailed audit messages
ALTER TABLE audit_logs MODIFY COLUMN details TEXT NULL;
