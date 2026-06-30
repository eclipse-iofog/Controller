'use strict'

const { Op } = require('sequelize')
const { runInTransaction, PRIORITY_INTERACTIVE, PRIORITY_BACKGROUND } = require('../../helpers/transaction-runner')

function isExpired (expiresAt) {
  return expiresAt && expiresAt <= new Date()
}

function rowToPayload (row) {
  const payload = JSON.parse(row.payload)
  if (row.consumed) {
    payload.consumed = row.consumedAt || true
  }
  return payload
}

class OidcProviderAdapter {
  constructor (name, getStateModel) {
    this.name = name
    this.getStateModel = getStateModel
  }

  async upsert (id, payload, expiresIn) {
    const AuthOidcProviderState = this.getStateModel()
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

    await runInTransaction(async (transaction) => {
      await AuthOidcProviderState.upsert({
        model: this.name,
        recordId: id,
        payload: JSON.stringify(payload),
        expiresAt,
        grantId: payload.grantId || null,
        uid: payload.uid || null,
        userCode: payload.userCode || null,
        consumed: false,
        consumedAt: null
      }, { transaction, conflictFields: ['model', 'record_id'] })
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.upsert' })
  }

  async find (id) {
    const AuthOidcProviderState = this.getStateModel()

    return runInTransaction(async (transaction) => {
      const row = await AuthOidcProviderState.findOne({
        where: {
          model: this.name,
          recordId: id
        },
        transaction
      })

      if (!row || isExpired(row.expiresAt)) {
        return undefined
      }

      return rowToPayload(row)
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.find' })
  }

  async findByUserCode (userCode) {
    const AuthOidcProviderState = this.getStateModel()

    return runInTransaction(async (transaction) => {
      const row = await AuthOidcProviderState.findOne({
        where: {
          model: this.name,
          userCode
        },
        transaction
      })

      if (!row || isExpired(row.expiresAt)) {
        return undefined
      }

      return rowToPayload(row)
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.findByUserCode' })
  }

  async findByUid (uid) {
    const AuthOidcProviderState = this.getStateModel()

    return runInTransaction(async (transaction) => {
      const row = await AuthOidcProviderState.findOne({
        where: {
          model: this.name,
          uid
        },
        transaction
      })

      if (!row || isExpired(row.expiresAt)) {
        return undefined
      }

      return rowToPayload(row)
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.findByUid' })
  }

  async consume (id) {
    const AuthOidcProviderState = this.getStateModel()

    await runInTransaction(async (transaction) => {
      await AuthOidcProviderState.update({
        consumed: true,
        consumedAt: new Date()
      }, {
        where: {
          model: this.name,
          recordId: id
        },
        transaction
      })
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.consume' })
  }

  async destroy (id) {
    const AuthOidcProviderState = this.getStateModel()

    await runInTransaction(async (transaction) => {
      await AuthOidcProviderState.destroy({
        where: {
          model: this.name,
          recordId: id
        },
        transaction
      })
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.destroy' })
  }

  async revokeByGrantId (grantId) {
    const AuthOidcProviderState = this.getStateModel()

    await runInTransaction(async (transaction) => {
      await AuthOidcProviderState.destroy({
        where: {
          grantId
        },
        transaction
      })
    }, { priority: PRIORITY_INTERACTIVE, label: 'oidc.adapter.revokeByGrantId' })
  }
}

function createOidcProviderAdapterFactory (getStateModel) {
  return (name) => new OidcProviderAdapter(name, getStateModel)
}

async function purgeExpiredOidcProviderStates (getStateModel) {
  const AuthOidcProviderState = getStateModel()

  await runInTransaction(async (transaction) => {
    await AuthOidcProviderState.destroy({
      where: {
        expiresAt: {
          [Op.lte]: new Date()
        }
      },
      transaction
    })
  }, { priority: PRIORITY_BACKGROUND, label: 'oidc.adapter.purgeExpired' })
}

module.exports = {
  OidcProviderAdapter,
  createOidcProviderAdapterFactory,
  purgeExpiredOidcProviderStates
}
