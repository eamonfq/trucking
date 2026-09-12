CREATE TABLE IF NOT EXISTS private_files (
  id CHAR(36) PRIMARY KEY,
  owner_id VARCHAR(80) NOT NULL,
  entity_type ENUM('box','invoice') NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  original_name VARCHAR(180) NOT NULL,
  mime_type VARCHAR(60) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  content MEDIUMBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX(owner_id), INDEX(entity_type,entity_id),
  FOREIGN KEY(owner_id) REFERENCES accounts(user_id)
);
INSERT IGNORE INTO schema_migrations(version) VALUES (2);
