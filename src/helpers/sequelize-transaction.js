const Transaction = require('sequelize/lib/transaction')

function isSequelizeTransaction (value) {
  if (value == null || typeof value !== 'object') {
    return false
  }
  if (value instanceof Transaction) {
    return true
  }
  return typeof value.commit === 'function' && typeof value.rollback === 'function'
}

module.exports = {
  isSequelizeTransaction
}
