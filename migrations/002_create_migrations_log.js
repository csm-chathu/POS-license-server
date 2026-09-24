/**
 * Migration 002 — Migrations tracking table (run this first)
 */
async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(191) NOT NULL UNIQUE,
      ran_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ Created _migrations table');
}

async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS _migrations;`);
}

module.exports = { up, down };
