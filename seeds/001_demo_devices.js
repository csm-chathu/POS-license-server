/**
 * Seed 001 — Demo device licenses for testing
 */
async function run(sequelize) {
  const now  = new Date();
  const add  = days => { const d = new Date(now); d.setDate(d.getDate() + days); return d; };

  const rows = [
    {
      device_id:   'MID-demo0001',
      device_name: 'Demo Shop - Terminal 1',
      license_key: 'LMUC-DEMO-MONT-HLY1',
      plan:        'monthly',
      status:      'active',
      expires_at:  add(30),
      notes:       'Demo monthly license',
    },
    {
      device_id:   'MID-demo0002',
      device_name: 'Demo Shop - Terminal 2',
      license_key: 'LMUC-DEMO-TRIA-L001',
      plan:        'trial',
      status:      'active',
      expires_at:  add(3),
      notes:       'Demo 3-day trial',
    },
    {
      device_id:   'MID-demo0003',
      device_name: 'RA Gold - Main Terminal',
      license_key: 'LMUC-LIFE-TIME-0001',
      plan:        'lifetime',
      status:      'active',
      expires_at:  null,
      notes:       'Lifetime license - RA Gold Shop',
    },
    {
      device_id:   'MID-demo0004',
      device_name: 'Expired Device',
      license_key: 'LMUC-EXPD-2024-0001',
      plan:        'monthly',
      status:      'active',
      expires_at:  add(-5),
      notes:       'Already expired - for testing',
    },
    {
      device_id:   'MID-demo0005',
      device_name: 'Revoked Device',
      license_key: 'LMUC-REVK-0000-0001',
      plan:        'monthly',
      status:      'revoked',
      expires_at:  add(20),
      notes:       'Revoked due to chargeback',
    },
  ];

  for (const row of rows) {
    await sequelize.query(`
      INSERT INTO device_licenses
        (device_id, device_name, license_key, plan, status, expires_at, notes, created_at, updated_at)
      VALUES
        (:device_id, :device_name, :license_key, :plan, :status, :expires_at, :notes, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        notes       = VALUES(notes)
    `, { replacements: row });
  }

  console.log(`✓ Seeded ${rows.length} demo device licenses`);
}

module.exports = { run };
