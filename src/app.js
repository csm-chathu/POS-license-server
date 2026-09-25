require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { sequelize } = require('./models');

const app  = express();
const PORT = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());

// ─── Public license endpoints ─────────────────────────────────────────────────
app.use('/api/license', require('./routes/license'));

// ─── Admin endpoints (protected by X-Admin-Key header) ───────────────────────
app.use('/admin', require('./routes/admin'));

// ─── Admin UI (static HTML) ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

// ─── Download redirect — always points to latest .exe release ────────────────
app.get('/download', async (req, res) => {
  const repo = process.env.GITHUB_REPO || 'csm-chathu/POS-offline';
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'LMUC-License-Server' },
    });
    if (!response.ok) throw new Error('GitHub API error');
    const release = await response.json();
    const asset = release.assets?.find(a => a.name.endsWith('.exe'));
    if (asset) return res.redirect(302, asset.browser_download_url);
    return res.redirect(302, `https://github.com/${repo}/releases/latest`);
  } catch {
    return res.redirect(302, `https://github.com/${repo}/releases/latest`);
  }
});

// ─── Download page ────────────────────────────────────────────────────────────
app.get('/get', (req, res) => res.sendFile(require('path').join(__dirname, '..', 'public', 'download.html')));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

// ─── Start ────────────────────────────────────────────────────────────────────
sequelize.authenticate()
  .then(() => {
    console.log('✓ Database connected');
    return sequelize.sync({ force: false });
  })
  .then(() => {
    console.log('✓ Tables ready');
    app.listen(PORT, () => console.log(`License server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('✗ DB connection failed:', err.message);
    process.exit(1);
  });
