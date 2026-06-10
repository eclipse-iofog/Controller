/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

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
      where: where,
      order: [ [ 'name', 'ASC' ] ],
      include: [
        { model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        },
        { model: Architecture,
          as: 'architecture',
          attributes: ['id', 'name', 'image', 'description']
        }
      ]
    }, {
      transaction: transaction
    })
  }

  async findOneWithTags (where, transaction) {
    return Fog.findOne({
      where,
      include: [
        { model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        },
        { model: Architecture,
          as: 'architecture',
          attributes: ['id', 'name', 'image', 'description']
        }
      ]
    }, { transaction })
  }

  async findAll (where, transaction) {
    return Fog.findAll({
      where: where,
      order: [ [ 'name', 'ASC' ] ]
    }, {
      transaction: transaction
    })
  }

  // no transaction required here, used by agent-last-active decorator
  updateLastActive (uuid, timestamp) {
    return Fog.update({
      lastActive: timestamp
    }, {
      where: {
        uuid: uuid
      }
    })
  }
}

const instance = new FogManager()
module.exports = instance
