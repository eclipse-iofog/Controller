const AppHelper = require('../../helpers/app-helper')
const Errors = require('../../helpers/errors')

// TODO [when transactions concurrency issue fixed]: Transactions should be used always
module.exports = class BaseManager {
  getEntity () {
    throw new Error('Not implemented getEntity method in manager')
  }

  async findAll (object, transaction) {
    AppHelper.checkTransaction(transaction)

    object = object || {}

    const options = transaction.fakeTransaction
      ? {
          where: object
        }
      : {
          where: object,
          transaction
        }

    return this.getEntity().findAll(options)
  }

  findAllWithAttributes (where, attributes, transaction) {
    return this.getEntity().findAll({
      where,
      attributes
    },
    { transaction })
  }

  async findOne (object, transaction) {
    AppHelper.checkTransaction(transaction)

    object = object || {}

    const options = transaction.fakeTransaction
      ? {
          where: object
        }
      : {
          where: object,
          transaction
        }

    return this.getEntity().findOne(options)
  }

  async create (object, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {}
      : { transaction }

    return this.getEntity().create(object, options)
  }

  async bulkCreate (arr, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {}
      : { transaction }

    return this.getEntity().bulkCreate(arr, options)
  }

  async delete (data, transaction) {
    AppHelper.checkTransaction(transaction)

    data = data || {}

    const options = transaction.fakeTransaction
      ? {
          where: data
        }
      : {
          where: data,
          transaction
        }

    return this.getEntity().destroy(options)
  }

  async update (whereData, newData, transaction) {
    AppHelper.checkTransaction(transaction)

    whereData = whereData || {}

    const options = transaction.fakeTransaction
      ? {
          where: whereData
        }
      : {
          where: whereData,
          transaction
        }

    return this.getEntity().update(newData, options)
  }

  async upsert (data, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {}
      : { transaction }

    return this.getEntity().upsert(data, options)
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
