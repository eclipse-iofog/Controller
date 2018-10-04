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

module.exports = class BaseManager {

  getEntity() {
    return null;
  }

  find(object) {

    object = object || {};

    if (object.limit && object.limit == -1)
      delete object.limit;

    return this.getEntity().findAll(object);
  }

  create(object) {
    if (this.getEntity().attributes.createdAt)
      object.createdAt = moment.utc().valueOf();

    return this.getEntity().create(object);
  }

  findById(id, include) {
    return this.getEntity().findById(id, {
      include: include
    });
  }

  deleteById(id) {
    return this.findById(id)
      .then((object) => {
        if (null == object)
          return;
        return object.destroy();
      });
  }

  update(newObject) {
    //find the new content by id
    return this.findById(newObject.id)
      .then((dbObject) => {
        //if id is invalid throw error
        if (null == dbObject)
          throw Error('invalid id');
        //update the properties
        this.updateObject(dbObject, newObject);
        //if there are any updated properties
        //save the changes, otherwise return the object as it is to next step
        if (!dbObject.changed())
          return dbObject;
        return dbObject.save();
      });
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