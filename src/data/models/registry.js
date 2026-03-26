'use strict'

const SecretHelper = require('../../helpers/secret-helper')

// Minimum length for internal encryption format: base64(salt(16) + iv(12) + tag(16) + encrypted)
const INTERNAL_ENCRYPTED_MIN_LENGTH = 60

function isPasswordEmpty (password) {
  return password == null || (typeof password === 'string' && password.trim() === '')
}

function looksLikeInternalEncrypted (password) {
  if (password == null || typeof password !== 'string') return false
  if (password.length < INTERNAL_ENCRYPTED_MIN_LENGTH) return false
  try {
    const buf = Buffer.from(password, 'base64')
    return buf.length >= 44 // salt + iv + tag minimum
  } catch (err) {
    return false
  }
}

module.exports = (sequelize, DataTypes) => {
  const Registry = sequelize.define('Registry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    url: {
      type: DataTypes.TEXT,
      field: 'url'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      field: 'is_public'
    },
    username: {
      type: DataTypes.TEXT,
      field: 'user_name'
    },
    password: {
      type: DataTypes.TEXT,
      field: 'password',
      get () {
        const rawValue = this.getDataValue('password')
        if (rawValue == null) return rawValue
        if (SecretHelper.isVaultReference(rawValue)) return rawValue
        return rawValue
      },
      set (value) {
        this.setDataValue('password', value)
      }
    },
    userEmail: {
      type: DataTypes.TEXT,
      field: 'user_email'
    }
  }, {
    tableName: 'Registries',
    timestamps: false,
    underscored: true,
    hooks: {
      beforeSave: async (registry) => {
        if (!registry.changed('password')) return
        const password = registry.password
        if (isPasswordEmpty(password)) {
          registry.password = ''
          return
        }
        if (!registry.id) {
          return
        }
        if (SecretHelper.isVaultReference(password) || looksLikeInternalEncrypted(password)) {
          return
        }
        const encrypted = await SecretHelper.encryptSecret(
          { value: password },
          'registry-' + registry.id,
          'registry'
        )
        registry.password = encrypted
      },
      afterFind: async (result) => {
        const decryptPassword = async (registry) => {
          if (!registry || registry.password == null) return
          if (isPasswordEmpty(registry.password)) return
          if (!registry.id) return
          try {
            const decrypted = await SecretHelper.decryptSecret(
              registry.password,
              'registry-' + registry.id,
              'registry'
            )
            registry.password = decrypted && typeof decrypted.value !== 'undefined'
              ? decrypted.value
              : registry.password
          } catch (error) {
            // Legacy plain password or error - leave unchanged
          }
        }
        if (Array.isArray(result)) {
          for (const registry of result) {
            await decryptPassword(registry)
          }
        } else {
          await decryptPassword(result)
        }
      }
    }
  })
  return Registry
}
