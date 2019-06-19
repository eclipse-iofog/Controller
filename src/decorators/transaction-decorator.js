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

const db = require('./../database/models')
const retry = require('retry-as-promised')
const sequelize = db.sequelize
const Transaction = require('sequelize/lib/transaction')
const { isTest } = require('../helpers/app-helper')

function transaction(f) {
  return async function(...fArgs) {
    if (isTest()) {
      return await f.apply(this, fArgs)
    }

    // TODO [when transactions concurrency issue fixed]: Remove 'fArgs[fArgs.length - 1].fakeTransaction'
    if (fArgs.length > 0 && fArgs[fArgs.length - 1]
      && (fArgs[fArgs.length - 1] instanceof Transaction || fArgs[fArgs.length - 1].fakeTransaction)) {
      return await f.apply(this, fArgs)
    } else {
    // return f.apply(this, fArgs)
      return sequelize.transaction(async (t) => {
        fArgs.push(t)
        return await f.apply(this, fArgs)
      })
    }
  }
}

function generateTransaction(f) {
  return function(...args) {
    return retry(() => {
      const t = transaction(f)
      return t.apply(this, args)
    }, {
      max: 5,
      match: [
        sequelize.ConnectionError,
        'SQLITE_BUSY',
      ],
    })
  }
}

function fakeTransaction(f) {
  const fakeTransactionObject = { fakeTransaction: true }
  return async function(...fArgs) {
    if (isTest()) {
      return await f.apply(this, fArgs)
    }

    if (fArgs.length > 0 && fArgs[fArgs.length - 1] instanceof Transaction) {
      fArgs[fArgs.length - 1] = fakeTransactionObject
      return await f.apply(this, fArgs)
    } else {
      fArgs.push(fakeTransactionObject)
      return await f.apply(this, fArgs)
    }
  }
}

// TODO [when transactions concurrency issue fixed]: Remove
function generateFakeTransaction(f) {
  return function(...args) {
    return retry(() => {
      const t = fakeTransaction(f)
      return t.apply(this, args)
    }, {
      max: 5,
      match: [
        sequelize.ConnectionError,
        'SQLITE_BUSY',
      ],
    })
  }
}

module.exports = {
  generateTransaction: generateTransaction,
  generateFakeTransaction: generateFakeTransaction,
}
