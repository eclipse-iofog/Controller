const AppHelper = require('../../helpers/app-helper')
const Errors = require('../../helpers/errors')

module.exports = class BaseManager {
  getEntity () {
    throw new Error('Not implemented getEntity method in manager')
  }

  async findAll (object, transaction) {
    AppHelper.checkTransaction(transaction)

    object = object || {}

    return this.getEntity().findAll({
      where: object,
      transaction
    })
  }

  findAllWithAttributes (where, attributes, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findAll({
      where,
      attributes,
      transaction
    })
  }

  async findOne (object, transaction) {
    AppHelper.checkTransaction(transaction)

    object = object || {}

    return this.getEntity().findOne({
      where: object,
      transaction
    })
  }

  async create (object, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().create(object, { transaction })
  }

  async bulkCreate (arr, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().bulkCreate(arr, { transaction })
  }

  async delete (data, transaction) {
    AppHelper.checkTransaction(transaction)

    data = data || {}

    return this.getEntity().destroy({
      where: data,
      transaction
    })
  }

  async update (whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction)

    whereData = whereData || {}

    return this.getEntity().update(newData, {
      where: whereData,
      transaction
    })
  }

  async upsert (data, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().upsert(data, { transaction })
  }

  async updateOrCreate (whereData, data, transaction) {
    AppHelper.checkTransaction(transaction)

    const obj = await this.findOne(whereData, transaction)
    if (obj) {
      await this.update(whereData, data, transaction)
      return this.findOne(whereData, transaction)
    } else {
      return this.create(data, transaction)
    }
  }

  async updateIfChanged (whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction)

    const obj = await this.findOne(whereData, transaction)
    if (!obj) {
      throw new Errors.NotFoundError(`${this.getEntity().name} not found`)
    }

    let hasUpdates = false
    for (const fldName in newData) {
      if (Object.hasOwn(newData, fldName) && Object.hasOwn(obj.dataValues, fldName) &&
          newData[fldName] !== obj.dataValues[fldName]) {
        hasUpdates = true
        break
      }
    }

    if (hasUpdates) {
      return this.update(whereData, newData, transaction)
    }
  }

  async updateAndFind (whereData, data, transaction) {
    AppHelper.checkTransaction(transaction)

    const obj = await this.findOne(whereData, transaction)
    if (obj) {
      await this.update(whereData, data, transaction)
      return this.findOne(whereData, transaction)
    }
  }
}
