CREATE TABLE IF NOT EXISTS schema_migrations (version INT PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS operation_lock (id INT PRIMARY KEY);
INSERT IGNORE INTO operation_lock(id) VALUES (1);
CREATE TABLE IF NOT EXISTS entities (
  collection_name VARCHAR(40) NOT NULL, entity_id VARCHAR(80) NOT NULL,
  payload JSON NOT NULL, position_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY(collection_name,entity_id)
);
CREATE TABLE IF NOT EXISTS accounts (
  sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  locker_code VARCHAR(40) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY, user_id VARCHAR(80) NOT NULL,
  expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX(user_id), INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash CHAR(64) PRIMARY KEY, user_id VARCHAR(80) NOT NULL,
  purpose ENUM('verify','reset','invite') NOT NULL,
  expires_at DATETIME(3) NOT NULL, consumed_at DATETIME(3) NULL,
  INDEX(user_id,purpose), INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_hash CHAR(64) PRIMARY KEY, attempts INT NOT NULL, expires_at DATETIME(3) NOT NULL,
  INDEX(expires_at)
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id CHAR(36) PRIMARY KEY, payload JSON NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued', attempts INT NOT NULL DEFAULT 0,
  provider_id VARCHAR(100) NULL UNIQUE, last_error VARCHAR(500) NULL,
  available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX(status,available_at)
);
CREATE TABLE IF NOT EXISTS email_events (
  event_id VARCHAR(100) PRIMARY KEY, provider_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(60) NOT NULL, occurred_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS security_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(80) NULL,
  event_type VARCHAR(80) NOT NULL, created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT IGNORE INTO schema_migrations(version) VALUES (1);
