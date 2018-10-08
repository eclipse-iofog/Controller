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

const moment = require('moment');
const _ = require('underscore');

const AppHelper = require('../../helpers/app-helper');

module.exports = class BaseManager {

  getEntity() {
    return null;
  }

  findAll(object, transaction) {
    AppHelper.checkTransaction(transaction);

    object = object || {};

    if (object.limit && object.limit === -1)
      delete object.limit;

    return this.getEntity().findAll({
      where: object,
      transaction: transaction
    });
  }

  findOne(object, transaction) {
    AppHelper.checkTransaction(transaction);

    object = object || {};

    return this.getEntity().findOne({
      where: object,
      transaction: transaction
    });
  }

  create(object, transaction) {
    AppHelper.checkTransaction(transaction)

    if (this.getEntity().attributes.createdAt)
      object.createdAt = moment.utc().valueOf();

    return this.getEntity().create(object, {transaction: transaction});
  }

  //TODO: add transactions for methods down

  findById(id, include) {
    return this.getEntity().findById(id, {
      include: include
    });
  }

  async deleteById(id) {
    const object = await this.findById(id);
    if (null == object)
      return;

    return object.destroy();
  }

  async update(newObject) {
    let dbObject = await this.findById(newObject.id);
    if (null == dbObject)
      throw new Error('invalid id');

    this.updateObject(dbObject, newObject);
    if (!dbObject.changed())
      return dbObject;

    return dbObject.save();
  }

  //src, destination
  //destination should be a sequelize object
  updateObject(destination, source) {
    _.each(source, (value, key) => {
      if (key !== 'id' && key !== 'createdAt' && _.has(destination.dataValues, key)) {
        if (destination[key] !== source[key])
          destination[key] = source[key];
      }
    });
  };

};