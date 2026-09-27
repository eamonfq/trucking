-- NULL permits multiple customers without an email while retaining uniqueness for actual emails.
ALTER TABLE accounts MODIFY email VARCHAR(254) NULL;
INSERT IGNORE INTO schema_migrations(version) VALUES (7);
