/**
 * CLI License Key Generator
 *
 * Usage:
 *   node scripts/generate-key.js --device MID-a3f9b2c1 --plan monthly
 *   node scripts/generate-key.js --device MID-a3f9b2c1 --plan yearly --days 365 --notes "RA Gold Shop"
 *   node scripts/generate-key.js --device MID-a3f9b2c1 --plan lifetime
 *   node scripts/generate-key.js --device MID-a3f9b2c1 --plan trial --days 7
 *
 * Plans: trial | monthly | yearly | lifetime
 */
require('dotenv').config();
const sequelize = require('../src/db');

const PLAN_DAYS = { trial: 3, monthly: 30, yearly: 365, lifetime: null };

function generateKey() {
  const seg = () => Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `LMUC-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    result[args[i].replace('--', '')] = args[i + 1];
  }
  return result;
}

async function run() {
  const args = parseArgs();

  if (!args.device) {
    console.error('Error: --device is required');
    console.log('\nUsage: node scripts/generate-key.js --device <deviceId> --plan <plan> [--days <n>] [--notes "text"]');
    process.exit(1);
  }

  const plan    = args.plan  || 'monthly';
  const days    = args.days  ? parseInt(args.days) : PLAN_DAYS[plan];
  const notes   = args.notes || null;
  const name    = args.name  || null;
  const key     = generateKey();

  const expiresAt = days ? (() => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  })() : null;

  await sequelize.authenticate();

  const [existing] = await sequelize.query(
    'SELECT id FROM device_licenses WHERE device_id = ?',
    { replacements: [args.device] }
  );

  if (existing.length) {
    await sequelize.query(`
      UPDATE device_licenses
      SET license_key = ?, plan = ?, status = 'active', expires_at = ?, notes = COALESCE(?, notes), updated_at = NOW()
      WHERE device_id = ?
    `, { replacements: [key, plan, expiresAt, notes, args.device] });
    console.log('\n✓ License UPDATED');
  } else {
    await sequelize.query(`
      INSERT INTO device_licenses (device_id, device_name, license_key, plan, status, expires_at, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())
    `, { replacements: [args.device, name, key, plan, expiresAt, notes] });
    console.log('\n✓ License CREATED');
  }

  console.log('─────────────────────────────────────');
  console.log(`  Device ID  : ${args.device}`);
  console.log(`  Plan       : ${plan}`);
  console.log(`  Key        : ${key}`);
  console.log(`  Expires    : ${expiresAt ? expiresAt.toISOString().slice(0, 10) : 'Never (lifetime)'}`);
  if (notes) console.log(`  Notes      : ${notes}`);
  console.log('─────────────────────────────────────');
  console.log('\nSend this key to the customer:');
  console.log(`\n  ${key}\n`);

  await sequelize.close();
}

run().catch(err => { console.error(err.message); process.exit(1); });
