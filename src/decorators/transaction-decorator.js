/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
const cq = require('concurrent-queue')

const db = require('./../sequelize/models')
const sequelize = db.sequelize
const Transaction = require('sequelize/lib/transaction')
const { isTest } = require('../helpers/app-helper')

const transactionsQueue = cq()
    .limit({ concurrency: 1 })
    .process((task, cb) => {
      task.transaction
          .apply(task.that, task.args)
          .then((res) => cb(null, res))
          .catch((err) => cb(err, null))
    })

function transaction(f) {
  return async function(...fArgs) {
    if (isTest()) {
      return await f.apply(this, fArgs)
    }

    if (fArgs.length > 0 && fArgs[fArgs.length - 1] && (fArgs[fArgs.length - 1] instanceof Transaction)) {
      return await f.apply(this, fArgs)
    } else {
      return sequelize.transaction(async (t) => {
        fArgs.push(t)
        return await f.apply(this, fArgs)
      })
    }
  }
}

function queueTransaction(resolve, reject, transaction, that, retries, ...args) {
  const task = {
    transaction,
    that,
    retries,
    args,
  }

  transactionsQueue(task, (error, success) => {
    if (error === null) {
      return resolve(success)
    }

    if (retries < 1 || (error.message || '').indexOf('SQLITE_BUSY') === -1) {
      return reject(error)
    }

    queueTransaction(resolve, reject, transaction, that, retries - 1, ...args)
  })
}

function applyTransaction(resolve, reject, transaction, that, ...args) {
  transaction.apply(that, args)
      .then(resolve)
      .catch((error) => {
        if ((error.message || '').indexOf('SQLITE_BUSY') === -1) {
          return reject(error)
        }

        queueTransaction(resolve, reject, t, this, 5, ...args)
      })
}

function generateTransaction(f) {
  return function(...args) {
    const t = transaction(f)

    return new Promise((resolve, reject) => {
      applyTransaction(resolve, reject, t, this, ...args)
    })
  }
}

module.exports = {
  generateTransaction: generateTransaction,
}
