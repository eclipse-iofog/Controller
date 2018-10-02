
const moment = require('moment');
/*const errorUtils = require('./../utils/errorUtils');*/
const _ = require('underscore');

//src, destination
//destination should be a sequzlize object
const updateObject = (destination, source) => {
  _.each(source, (value, key) => {
    if (key != 'id' && key != 'createdAt' && _.has(destination.dataValues, key)) {
      if (destination[key] != source[key])
        destination[key] = source[key];
    }
  });
};

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
          throw 'invalid id';

        //update the properties
        updateObject(dbObject, newObject);

        //if there are any updated properites
        //save the changes, otherwise return the object as it is to next step
        if (!dbObject.changed())
          return dbObject;

        return dbObject.save();
      });
  }

  count(where) {
    let queryObject = {};
    if (where)
      queryObject.where = where;

    return this.getEntity().count(queryObject);
  }

};