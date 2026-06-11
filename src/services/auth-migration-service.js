'use strict'

const db = require('../data/models')
const { withTransaction } = require('../helpers/app-helper')
const TransactionDecorator = require('../decorators/transaction-decorator')
const AuthUserService = require('./auth-user-service')

async function exportMigrationData (transaction) {
  AuthUserService.ensureEmbeddedMode()

  const users = await db.AuthUser.findAll(withTransaction(transaction, {
    where: { deletedAt: null },
    include: [{
      model: db.AuthGroup,
      as: 'groups',
      through: { attributes: [] }
    }],
    order: [['email', 'ASC']]
  }))

  const groups = await db.AuthGroup.findAll(withTransaction(transaction, {
    order: [['name', 'ASC']]
  }))

  return {
    exportedAt: new Date().toISOString(),
    authMode: 'embedded',
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      groups: (user.groups || []).map((group) => group.name)
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      isSystem: group.isSystem
    }))
  }
}

module.exports = {
  exportMigrationData: TransactionDecorator.generateTransaction(exportMigrationData)
}
