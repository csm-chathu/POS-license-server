/**
 * Migration runner
 * Usage: node scripts/migrate.js [--rollback]
 */
require('dotenv').config();
const path      = require('path');
const fs        = require('fs');
const sequelize = require('../src/db');

async function run() {
  const rollback = process.argv.includes('--rollback');

  await sequelize.authenticate();
  console.log('✓ Connected to database');

  // Ensure migrations log table exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id     INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name   VARCHAR(191) NOT NULL UNIQUE,
      ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (rollback) {
    // Run down() on the last migration
    const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id DESC LIMIT 1');
    if (!rows.length) { console.log('Nothing to rollback'); process.exit(0); }
    const lastName = rows[0].name;
    const mod = require(path.join(migrationsDir, lastName));
    await mod.down(sequelize);
    await sequelize.query('DELETE FROM _migrations WHERE name = ?', { replacements: [lastName] });
    console.log(`✓ Rolled back: ${lastName}`);
  } else {
    const [ran] = await sequelize.query('SELECT name FROM _migrations');
    const ranSet = new Set(ran.map(r => r.name));

    let count = 0;
    for (const file of files) {
      if (ranSet.has(file)) { console.log(`  skip  ${file}`); continue; }
      const mod = require(path.join(migrationsDir, file));
      await mod.up(sequelize);
      await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', { replacements: [file] });
      console.log(`  ran   ${file}`);
      count++;
    }

    console.log(count ? `\n✓ ${count} migration(s) applied` : '\n✓ Already up to date');
  }

  await sequelize.close();
}

run().catch(err => { console.error(err.message); process.exit(1); });
