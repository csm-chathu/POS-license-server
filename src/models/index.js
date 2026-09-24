const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const DeviceLicense = sequelize.define('DeviceLicense', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  device_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Machine fingerprint from the client app',
  },
  device_name: {
    type: DataTypes.STRING(191),
    allowNull: true,
    comment: 'Human-readable name e.g. "RA Gold - Terminal 1"',
  },
  license_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Key the customer enters to activate',
  },
  plan: {
    type: DataTypes.ENUM('trial', 'monthly', 'yearly', 'lifetime'),
    defaultValue: 'trial',
  },
  status: {
    type: DataTypes.ENUM('active', 'revoked', 'expired'),
    defaultValue: 'active',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'NULL = lifetime (never expires)',
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Admin notes e.g. customer name, shop',
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the customer first entered a paid key',
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time the app called /check',
  },
}, {
  tableName: 'device_licenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = { DeviceLicense, sequelize };
