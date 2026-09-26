CREATE TABLE IF NOT EXISTS push_subscriptions (
 id CHAR(64) PRIMARY KEY, user_id VARCHAR(80) NOT NULL, session_hash CHAR(64) NOT NULL,
 subscription JSON NOT NULL, created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
 INDEX(user_id), FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
 FOREIGN KEY(session_hash) REFERENCES sessions(token_hash) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS push_outbox (
 id CHAR(36) NOT NULL, subscription_id CHAR(64) NOT NULL, user_id VARCHAR(80) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'queued', attempts INT NOT NULL DEFAULT 0,
 available_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3), created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(id,subscription_id), INDEX(status,available_at),
 FOREIGN KEY(subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);
INSERT IGNORE INTO schema_migrations(version) VALUES (6);
