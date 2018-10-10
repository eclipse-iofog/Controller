/*
* *******************************************************************************
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

const AppHelper = require('../../helpers/app-helper');
const Errors = require('../../helpers/errors')

module.exports = class BaseManager {

  getEntity() {
    return null;
  }

  async findAll(object, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().findAll({
      where: object,
      transaction: transaction
    });
  }

  async findOne(object, transaction) {
    AppHelper.checkTransaction(transaction);

    object = object || {};

    return this.getEntity().findOne({
      where: object,
      transaction: transaction
    });
  }

  async create(object, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().create(object, {
      transaction: transaction
    });
  }

  findOneAndUpdate(whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.findOne(whereData, transaction)
      .then((obj) => {
        if (obj) {
          return this.update(whereData, newData, transaction);
        } else {
          throw new Errors.ModelNotFoundError()
        }
      })
  }


  //TODO: add transactions for methods down

  async delete(data, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().destroy({
      where: data,
      transaction: transaction
    })
  }

  async update(whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().update(newData, {
      where: whereData,
      transaction: transaction
    });
  }

  async upsert(data, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().upsert(data, {
        transaction: transaction
      }
    )
  }

};