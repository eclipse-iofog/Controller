'use strict'

const { Op } = require('sequelize')
const db = require('../data/models')
const { withTransaction } = require('../helpers/app-helper')

const OIDC_STATE_MODELS = ['Session', 'Grant', 'Interaction']

async function destroyEmbeddedOidcStateForUser (userId, transaction) {
  const rows = await db.AuthOidcProviderState.findAll(withTransaction(transaction, {
    where: {
      model: {
        [Op.in]: OIDC_STATE_MODELS
      }
    }
  }))

  for (const row of rows) {
    let payload
    try {
      payload = JSON.parse(row.payload)
    } catch {
      continue
    }
    if (payload.accountId === userId) {
      await row.destroy(withTransaction(transaction))
    }
  }
}

module.exports = {
  destroyEmbeddedOidcStateForUser
}
