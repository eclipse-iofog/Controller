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
    throw new Error("Not implemented getEntity method in manager");
  }

  async findAll(object, transaction) {
    AppHelper.checkTransaction(transaction);

    object = object || {};

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

  async bulkCreate(arr, transaction) {
    AppHelper.checkTransaction(transaction);

    return this.getEntity().bulkCreate(arr, {
      transaction: transaction
    });
  }

  async delete(data, transaction) {
    AppHelper.checkTransaction(transaction);

    data = data || {};
    return this.getEntity().destroy({
      where: data,
      transaction: transaction
    })
  }

  async update(whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction);

    whereData = whereData || {};
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

  async updateOrCreate(whereData, data, transaction) {
    AppHelper.checkTransaction(transaction);

    const obj = await this.findOne(whereData, transaction)
    if (obj) {
      await this.update(whereData, data, transaction)
      return this.findOne(whereData, transaction)
    } else {
      return this.create(data, transaction)
    }

  }
};