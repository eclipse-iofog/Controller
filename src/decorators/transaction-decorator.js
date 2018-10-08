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
const sequelize = db.sequelize;

function generateTransaction(f) {
  return async function() {
    const fArgs = Array.prototype.slice.call(arguments);
    return sequelize.transaction(async (t) => {
      fArgs.push(t);
      return await f.apply(this, fArgs);
    })
  }
}

module.exports = {
  generateTransaction: generateTransaction,
};