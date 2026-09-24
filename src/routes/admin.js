const router = require('express').Router();
const { Op }  = require('sequelize');
const { DeviceLicense } = require('../models');

// ─── Admin auth middleware ────────────────────────────────────────────────────
router.use((req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

function addDays(base, days) {
  const d = new Date(base || Date.now());
  d.setDate(d.getDate() + days);
  return d;
}

function generateKey() {
  const seg = () => Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `LMUC-${seg()}-${seg()}-${seg()}-${seg()}`;
}

const PLAN_DAYS = { trial: 3, monthly: 30, yearly: 365, lifetime: null };

// ─── GET /admin/licenses ──────────────────────────────────────────────────────
router.get('/licenses', async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.plan)   where.plan   = req.query.plan;
  if (req.query.search) {
    where[Op.or] = [
      { device_id:   { [Op.like]: `%${req.query.search}%` } },
      { device_name: { [Op.like]: `%${req.query.search}%` } },
      { notes:       { [Op.like]: `%${req.query.search}%` } },
    ];
  }

  const rows = await DeviceLicense.findAll({
    where,
    order: [['created_at', 'DESC']],
  });

  // Auto-mark expired rows
  const now = new Date();
  const result = rows.map(r => {
    const expired = r.expires_at && new Date(r.expires_at) < now;
    return {
      ...r.toJSON(),
      is_expired: expired,
      days_left: r.expires_at
        ? Math.max(0, Math.ceil((new Date(r.expires_at) - now) / 86400000))
        : null,
    };
  });

  const stats = {
    total:    result.length,
    active:   result.filter(r => r.status === 'active' && !r.is_expired).length,
    trial:    result.filter(r => r.plan === 'trial').length,
    expired:  result.filter(r => r.is_expired).length,
    revoked:  result.filter(r => r.status === 'revoked').length,
  };

  res.json({ stats, data: result });
});

// ─── GET /admin/licenses/:deviceId ───────────────────────────────────────────
router.get('/licenses/:deviceId', async (req, res) => {
  const license = await DeviceLicense.findOne({ where: { device_id: req.params.deviceId } });
  if (!license) return res.status(404).json({ error: 'Not found' });
  res.json(license);
});

// ─── POST /admin/licenses ─────────────────────────────────────────────────────
// Manually create a license for a device that has not yet launched the app.
router.post('/licenses', async (req, res) => {
  const { device_id, device_name, plan = 'monthly', notes, custom_days } = req.body;
  if (!device_id) return res.status(422).json({ error: 'device_id required' });

  const days = custom_days ?? PLAN_DAYS[plan];
  const key  = generateKey();

  try {
    const license = await DeviceLicense.create({
      device_id,
      device_name: device_name || 'Unknown',
      license_key: key,
      plan,
      status:     'active',
      expires_at: days ? addDays(new Date(), days) : null,
      notes,
    });
    res.status(201).json({ ...license.toJSON(), generated_key: key });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── PUT /admin/licenses/:deviceId ───────────────────────────────────────────
// Issue/renew a license: set plan, regenerate key, set new expiry.
router.put('/licenses/:deviceId', async (req, res) => {
  const license = await DeviceLicense.findOne({ where: { device_id: req.params.deviceId } });
  if (!license) return res.status(404).json({ error: 'Device not found' });

  const { plan, custom_days, notes, device_name, regenerate_key = true, expires_at } = req.body;

  const updates = {};
  if (plan)        updates.plan = plan;
  if (device_name) updates.device_name = device_name;
  if (notes !== undefined) updates.notes = notes;
  updates.status = 'active';

  if (regenerate_key) {
    updates.license_key = generateKey();
  }

  if (expires_at) {
    updates.expires_at = new Date(expires_at);
  } else if (plan) {
    const days = custom_days ?? PLAN_DAYS[plan];
    updates.expires_at = days ? addDays(new Date(), days) : null;
  }

  await license.update(updates);
  res.json({ ...license.toJSON(), new_key: updates.license_key || null });
});

// ─── POST /admin/licenses/:deviceId/revoke ────────────────────────────────────
router.post('/licenses/:deviceId/revoke', async (req, res) => {
  const license = await DeviceLicense.findOne({ where: { device_id: req.params.deviceId } });
  if (!license) return res.status(404).json({ error: 'Not found' });
  await license.update({ status: 'revoked' });
  res.json({ ok: true, message: 'Device revoked' });
});

// ─── POST /admin/licenses/:deviceId/reinstate ─────────────────────────────────
router.post('/licenses/:deviceId/reinstate', async (req, res) => {
  const license = await DeviceLicense.findOne({ where: { device_id: req.params.deviceId } });
  if (!license) return res.status(404).json({ error: 'Not found' });
  await license.update({ status: 'active' });
  res.json({ ok: true });
});

// ─── DELETE /admin/licenses/:deviceId ────────────────────────────────────────
router.delete('/licenses/:deviceId', async (req, res) => {
  const license = await DeviceLicense.findOne({ where: { device_id: req.params.deviceId } });
  if (!license) return res.status(404).json({ error: 'Not found' });
  await license.destroy();
  res.json({ ok: true });
});

module.exports = router;
