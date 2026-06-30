const BaseManager = require('./base-manager')
const models = require('../models')

const Fog = models.Fog
const Tags = models.Tags
const Architecture = models.Architecture

class FogManager extends BaseManager {
  getEntity () {
    return Fog
  }

  async findAllWithTags (where, transaction) {
    return Fog.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        },
        {
          model: Architecture,
          as: 'architecture',
          attributes: ['id', 'name', 'image', 'description']
        }
      ]
    }, {
      transaction
    })
  }

  async findOneWithTags (where, transaction) {
    return Fog.findOne({
      where,
      include: [
        {
          model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        },
        {
          model: Architecture,
          as: 'architecture',
          attributes: ['id', 'name', 'image', 'description']
        }
      ]
    }, { transaction })
  }

  async findAll (where, transaction) {
    return Fog.findAll({
      where,
      order: [['name', 'ASC']]
    }, {
      transaction
    })
  }

  updateLastActive (uuid, timestamp, transaction) {
    return Fog.update({
      lastActive: timestamp
    }, {
      where: {
        uuid
      },
      transaction
    })
  }
}

const instance = new FogManager()
module.exports = instance
