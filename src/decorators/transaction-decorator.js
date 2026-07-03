const { isTest } = require('../helpers/app-helper')
const { isSequelizeTransaction } = require('../helpers/sequelize-transaction')
const {
  runInTransaction,
  runWithTransactionContext,
  PRIORITY_INTERACTIVE,
  getActiveTransactionContext
} = require('../helpers/transaction-runner')

function hasTransactionArg (args) {
  return findTransactionArg(args) != null
}

function findTransactionArg (args) {
  for (let i = args.length - 1; i >= 0; i--) {
    if (isSequelizeTransaction(args[i])) {
      return args[i]
    }
  }
  return null
}

/**
 * @param {Function} f - Async function that accepts (..., transaction) as last argument
 * @param {{ priority?: string, label?: string }} [options]
 */
function generateTransaction (f, options = {}) {
  const priority = options.priority || PRIORITY_INTERACTIVE
  const label = options.label || f.name || 'generateTransaction'

  return function (...args) {
    if (isTest()) {
      return f.apply(this, args)
    }

    if (hasTransactionArg(args)) {
      const tx = findTransactionArg(args)
      return runWithTransactionContext(tx, priority, () => f.apply(this, args))
    }

    const parentCtx = getActiveTransactionContext()
    if (parentCtx?.transaction) {
      return runWithTransactionContext(parentCtx.transaction, parentCtx.priority, () =>
        f.apply(this, [...args, parentCtx.transaction]))
    }

    return runInTransaction(
      (transaction) => f.apply(this, [...args, transaction]),
      { priority, label }
    )
  }
}

module.exports = {
  generateTransaction
}
