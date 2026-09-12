ALTER TABLE accounts MODIFY COLUMN role ENUM('cliente','admin','operador') NOT NULL DEFAULT 'cliente';
INSERT IGNORE INTO schema_migrations(version) VALUES (3);
