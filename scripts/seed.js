/**
 * Seed runner
 * Usage: node scripts/seed.js
 */
require('dotenv').config();
const path      = require('path');
const fs        = require('fs');
const sequelize = require('../src/db');

async function run() {
  await sequelize.authenticate();
  console.log('✓ Connected\n');

  const seedsDir = path.join(__dirname, '..', 'seeds');
  const files    = fs.readdirSync(seedsDir).filter(f => f.endsWith('.js')).sort();

  for (const file of files) {
    console.log(`Running seed: ${file}`);
    const mod = require(path.join(seedsDir, file));
    await mod.run(sequelize);
  }

  console.log('\n✓ All seeds done');
  await sequelize.close();
}

run().catch(err => { console.error(err.message); process.exit(1); });
