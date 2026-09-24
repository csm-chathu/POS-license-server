/**
 * Migration 001 — Create device_licenses table
 */
async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS device_licenses (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      device_id       VARCHAR(64)  NOT NULL UNIQUE  COMMENT 'Machine fingerprint from client app',
      device_name     VARCHAR(191) DEFAULT NULL     COMMENT 'Human-readable device/shop name',
      license_key     VARCHAR(100) NOT NULL          COMMENT 'Key the customer enters to activate',
      plan            ENUM('trial','monthly','yearly','lifetime') NOT NULL DEFAULT 'trial',
      status          ENUM('active','revoked','expired')          NOT NULL DEFAULT 'active',
      expires_at      DATETIME     DEFAULT NULL      COMMENT 'NULL = lifetime (never expires)',
      notes           VARCHAR(255) DEFAULT NULL      COMMENT 'Admin notes — customer name, shop, etc.',
      activated_at    DATETIME     DEFAULT NULL      COMMENT 'First paid activation timestamp',
      last_checked_at DATETIME     DEFAULT NULL      COMMENT 'Last /check call from device',
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_plan   (plan),
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Created device_licenses table');
}

async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS device_licenses;`);
  console.log('✓ Dropped device_licenses table');
}

module.exports = { up, down };
