import moment from 'moment';
import sequelizeUtils from './../utils/sequelizeUtils';
import errorUtils from './../utils/errorUtils';

export default class BaseManager {

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
          throw new errorUtils.BadRequestError('Invalid id');

        //update the properties
        sequelizeUtils.updateObject(dbObject, newObject);

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

}