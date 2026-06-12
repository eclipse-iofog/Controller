'use strict'

const { Op } = require('sequelize')

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
    })
  }

  async find (id) {
    const AuthOidcProviderState = this.getStateModel()
    const row = await AuthOidcProviderState.findOne({
      where: {
        model: this.name,
        recordId: id
      }
    })

    if (!row || isExpired(row.expiresAt)) {
      return undefined
    }

    return rowToPayload(row)
  }

  async findByUserCode (userCode) {
    const AuthOidcProviderState = this.getStateModel()
    const row = await AuthOidcProviderState.findOne({
      where: {
        model: this.name,
        userCode
      }
    })

    if (!row || isExpired(row.expiresAt)) {
      return undefined
    }

    return rowToPayload(row)
  }

  async findByUid (uid) {
    const AuthOidcProviderState = this.getStateModel()
    const row = await AuthOidcProviderState.findOne({
      where: {
        model: this.name,
        uid
      }
    })

    if (!row || isExpired(row.expiresAt)) {
      return undefined
    }

    return rowToPayload(row)
  }

  async consume (id) {
    const AuthOidcProviderState = this.getStateModel()
    await AuthOidcProviderState.update({
      consumed: true,
      consumedAt: new Date()
    }, {
      where: {
        model: this.name,
        recordId: id
      }
    })
  }

  async destroy (id) {
    const AuthOidcProviderState = this.getStateModel()
    await AuthOidcProviderState.destroy({
      where: {
        model: this.name,
        recordId: id
      }
    })
  }

  async revokeByGrantId (grantId) {
    const AuthOidcProviderState = this.getStateModel()
    await AuthOidcProviderState.destroy({
      where: {
        grantId
      }
    })
  }
}

function createOidcProviderAdapterFactory (getStateModel) {
  return (name) => new OidcProviderAdapter(name, getStateModel)
}

async function purgeExpiredOidcProviderStates (getStateModel) {
  const AuthOidcProviderState = getStateModel()
  await AuthOidcProviderState.destroy({
    where: {
      expiresAt: {
        [Op.lte]: new Date()
      }
    }
  })
}

module.exports = {
  OidcProviderAdapter,
  createOidcProviderAdapterFactory,
  purgeExpiredOidcProviderStates
}
