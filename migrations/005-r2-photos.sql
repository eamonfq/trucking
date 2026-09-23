ALTER TABLE private_files
  MODIFY content MEDIUMBLOB NULL,
  ADD COLUMN storage_provider VARCHAR(16) NOT NULL DEFAULT 'mysql',
  ADD COLUMN object_key VARCHAR(255) NULL,
  ADD INDEX storage_created (storage_provider,entity_type,created_at);
INSERT IGNORE INTO schema_migrations(version) VALUES (5);
