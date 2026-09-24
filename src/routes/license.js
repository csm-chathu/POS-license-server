const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const { DeviceLicense } = require('../models');

const TRIAL_DAYS    = parseInt(process.env.TRIAL_DAYS    || '3');
const TRIAL_MINUTES = parseInt(process.env.TRIAL_MINUTES || '0');

function generateKey() {
  const seg = () => Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `LMUC-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function trialExpiry() {
  const d = new Date();
  if (TRIAL_MINUTES > 0) {
    d.setMinutes(d.getMinutes() + TRIAL_MINUTES);
  } else {
    d.setDate(d.getDate() + TRIAL_DAYS);
  }
  return d;
}

function isExpired(license) {
  if (!license.expires_at) return false;
  return new Date(license.expires_at) < new Date();
}

// ─── POST /api/license/init ───────────────────────────────────────────────────
// Called on first launch. Creates a trial record if device is new.
router.post('/init', async (req, res) => {
  const { deviceId, deviceName } = req.body;
  if (!deviceId) return res.status(422).json({ error: 'deviceId required' });

  let license = await DeviceLicense.findOne({ where: { device_id: deviceId } });

  if (!license) {
    const key = generateKey();
    license = await DeviceLicense.create({
      device_id:   deviceId,
      device_name: deviceName || 'Unknown Device',
      license_key: key,
      plan:        'trial',
      status:      'active',
      expires_at:  trialExpiry(),
    });
  }

  if (license.status === 'revoked') {
    return res.status(403).json({ error: 'Device revoked', revoked: true });
  }

  const expired = isExpired(license);

  return res.json({
    valid:      !expired && license.status === 'active',
    expired,
    plan:       license.plan,
    status:     license.status,
    expires_at: license.expires_at,
    key:        license.license_key,
    trial:      license.plan === 'trial',
    days_left:  license.expires_at
      ? Math.max(0, Math.ceil((new Date(license.expires_at) - new Date()) / 86400000))
      : null,
  });
});

// ─── POST /api/license/activate ──────────────────────────────────────────────
// Called when user enters a key in the activation modal.
router.post('/activate', async (req, res) => {
  const { deviceId, key } = req.body;
  if (!deviceId || !key) return res.status(422).json({ error: 'deviceId and key required' });

  const license = await DeviceLicense.findOne({ where: { device_id: deviceId } });
  if (!license) return res.status(404).json({ error: 'Device not registered. Launch app first.' });

  if (license.status === 'revoked') {
    return res.status(403).json({ error: 'Device has been revoked', revoked: true });
  }

  if (license.license_key !== key.trim()) {
    return res.status(401).json({ error: 'Invalid license key' });
  }

  const expired = isExpired(license);
  if (expired) {
    return res.status(402).json({ error: 'License key has expired. Contact support for renewal.', expired: true });
  }

  // Mark activated_at on first paid activation
  if (license.plan !== 'trial' && !license.activated_at) {
    await license.update({ activated_at: new Date(), last_checked_at: new Date() });
  } else {
    await license.update({ last_checked_at: new Date() });
  }

  return res.json({
    valid:      true,
    plan:       license.plan,
    status:     license.status,
    expires_at: license.expires_at,
    days_left:  license.expires_at
      ? Math.max(0, Math.ceil((new Date(license.expires_at) - new Date()) / 86400000))
      : null,
  });
});

// ─── POST /api/license/check ─────────────────────────────────────────────────
// Silent background check on every app launch (or every 24h).
router.post('/check', async (req, res) => {
  const { deviceId, key } = req.body;
  if (!deviceId) return res.status(422).json({ error: 'deviceId required' });

  const license = await DeviceLicense.findOne({ where: { device_id: deviceId } });
  if (!license) return res.status(404).json({ valid: false, error: 'Not registered' });

  await license.update({ last_checked_at: new Date() });

  if (license.status === 'revoked') {
    return res.json({ valid: false, revoked: true });
  }

  const expired = isExpired(license);

  return res.json({
    valid:      !expired && license.status === 'active',
    expired,
    revoked:    false,
    plan:       license.plan,
    status:     license.status,
    expires_at: license.expires_at,
    days_left:  license.expires_at
      ? Math.max(0, Math.ceil((new Date(license.expires_at) - new Date()) / 86400000))
      : null,
  });
});

module.exports = router;
