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

const db = require('./../sequelize/models');
const retry = require('retry-as-promised');
const sequelize = db.sequelize;

function transaction(f) {
  return function() {
    const fArgs = Array.prototype.slice.call(arguments);
    return sequelize.transaction(async (t) => {
      fArgs.push(t);
      return await f.apply(this, fArgs);
    })
  }
}

function generateTransaction(f) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return retry(() => {
      const t = transaction(f);
      return t.apply(this, args);
    }, 5)
  }
}

module.exports = {
  generateTransaction: generateTransaction,
};