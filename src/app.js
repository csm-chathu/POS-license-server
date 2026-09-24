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
