'use strict'

const { Store } = require('express-session')
const { Op } = require('sequelize')

class SequelizeSessionStore extends Store {
  constructor ({ model, ttlMs }) {
    super()
    this.model = model
    this.ttlMs = ttlMs
  }

  _expiresAt () {
    return new Date(Date.now() + this.ttlMs)
  }

  get (sid, callback) {
    this.model.findByPk(sid)
      .then((row) => {
        if (!row || (row.expiresAt && row.expiresAt <= new Date())) {
          return callback(null, null)
        }
        try {
          return callback(null, JSON.parse(row.data))
        } catch (error) {
          return callback(error)
        }
      })
      .catch((error) => callback(error))
  }

  set (sid, session, callback) {
    const expiresAt = this._expiresAt()
    const data = JSON.stringify(session)

    this.model.upsert({
      sid,
      data,
      expiresAt
    })
      .then(() => callback(null))
      .catch((error) => callback(error))
  }

  destroy (sid, callback) {
    this.model.destroy({ where: { sid } })
      .then(() => callback(null))
      .catch((error) => callback(error))
  }

  touch (sid, session, callback) {
    this.model.update({
      data: JSON.stringify(session),
      expiresAt: this._expiresAt()
    }, {
      where: { sid }
    })
      .then(() => callback(null))
      .catch((error) => callback(error))
  }

  async purgeExpired () {
    await this.model.destroy({
      where: {
        expiresAt: {
          [Op.lte]: new Date()
        }
      }
    })
  }
}

module.exports = SequelizeSessionStore
