/*
 * *******************************************************************************
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
const Service = models.Service
const Tags = models.Tags
const ServiceTag = models.ServiceTag

class ServiceManager extends BaseManager {
  getEntity () {
    return Service
  }

  async findAllWithTags (where, transaction) {
    return Service.findAll({
      where: where,
      order: [ [ 'name', 'ASC' ] ],
      include: [
        { model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        }
      ]
    }, {
      transaction: transaction
    })
  }

  async findOneWithTags (where, transaction) {
    return Service.findOne({
      where,
      include: [
        { model: Tags,
          as: 'tags',
          through: {
            attributes: []
          }
        }
      ]
    }, { transaction })
  }

  async setTags (serviceId, tagIds, transaction) {
    // First remove all existing tags
    await ServiceTag.destroy({
      where: { service_id: serviceId }
    }, { transaction })

    // Then add new tags
    if (tagIds && tagIds.length > 0) {
      const serviceTags = tagIds.map(tagId => ({
        service_id: serviceId,
        tag_id: tagId
      }))
      await ServiceTag.bulkCreate(serviceTags, { transaction })
    }
  }

  async addTag (serviceId, tagId, transaction) {
    await ServiceTag.create({
      service_id: serviceId,
      tag_id: tagId
    }, { transaction })
  }

  async removeTag (serviceId, tagId, transaction) {
    await ServiceTag.destroy({
      where: {
        service_id: serviceId,
        tag_id: tagId
      }
    }, { transaction })
  }
}

const instance = new ServiceManager()
module.exports = instance
