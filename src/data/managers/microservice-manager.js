/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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
const Microservice = models.Microservice
const MicroservicePort = models.MicroservicePort
const MicroserviceEnv = models.MicroserviceEnv
const MicroserviceExtraHost = models.MicroserviceExtraHost
const MicroserviceArg = models.MicroserviceArg
const VolumeMapping = models.VolumeMapping
const StraceDiagnostics = models.StraceDiagnostics
const CatalogItem = models.CatalogItem
const CatalogItemImage = models.CatalogItemImage
const Fog = models.Fog
const Application = models.Application
const User = models.User
const Routing = models.Routing
const Registry = models.Registry
const MicroserviceStatus = models.MicroserviceStatus
const Op = require('sequelize').Op

const microserviceExcludedFields = [
  'configLastUpdated',
  'created_at',
  'updated_at',
  'updatedBy',
  'isNetwork',
  'rebuild',
  'deleteWithCleanUp',
  'imageSnapshot',
  'catalog_item_id',
  'iofog_uuid'
]

class MicroserviceManager extends BaseManager {
  getEntity () {
    return Microservice
  }

  findAllWithDependencies (where, attributes, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: MicroserviceEnv,
          as: 'env',
          required: false,
          attributes: ['key', 'value']
        },
        {
          model: MicroserviceExtraHost,
          as: 'extraHosts',
          required: false
        },
        {
          model: MicroserviceArg,
          as: 'cmd',
          required: false,
          attributes: ['cmd']
        },
        {
          model: MicroservicePort,
          as: 'ports',
          required: false,
          attributes: ['portInternal', 'portExternal']
        },
        {
          model: VolumeMapping,
          as: 'volumeMappings',
          required: false,
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type']
        },
        {
          model: StraceDiagnostics,
          as: 'strace',
          required: false,
          attributes: ['straceRun']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'fogTypeId']
        },
        {
          model: Registry,
          as: 'registry',
          required: false,
          attributes: ['id']
        },
        {
          model: CatalogItem,
          as: 'catalogItem',
          required: false,
          include: [{
            model: CatalogItemImage,
            as: 'images',
            attributes: ['containerImage', 'fogTypeId']
          }],
          attributes: ['picture', 'registryId']
        },
        {
          model: Fog,
          as: 'iofog',
          required: false,
          attributes: ['daemonStatus']
        },
        {
          model: Routing,
          as: 'routes',
          required: false,
          include: [{
            model: Microservice,
            as: 'destMicroservice',
            attributes: ['uuid']
          }],
          attributes: { exclude: ['id', 'source_microservice_uuid',
            'sourceMicroserviceUuid', 'destMicroserviceUuid', 'sourceNetworkMicroserviceUuid',
            'destNetworkMicroserviceUuid', 'sourceIofogUuid', 'destIofogUuid'] }
        }
      ],
      where: where,
      attributes: attributes
    }, { transaction: transaction })
  }

  findAllActiveApplicationMicroservices (iofogUuid, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: MicroserviceEnv,
          as: 'env',
          required: false,
          attributes: ['key', 'value']
        },
        {
          model: MicroserviceExtraHost,
          as: 'extraHosts',
          required: false
        },
        {
          model: MicroserviceArg,
          as: 'cmd',
          required: false,
          attributes: ['cmd', 'id']
        },
        {
          model: MicroservicePort,
          as: 'ports',
          required: false,
          attributes: ['portInternal', 'portExternal']
        },
        {
          model: VolumeMapping,
          as: 'volumeMappings',
          required: false,
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'fogTypeId']
        },
        {
          model: Registry,
          as: 'registry',
          required: false,
          attributes: ['id']
        },
        {
          model: CatalogItem,
          as: 'catalogItem',
          required: false,
          include: [
            {
              model: CatalogItemImage,
              as: 'images',
              required: true,
              attributes: ['containerImage', 'fogTypeId']
            },
            {
              model: Registry,
              as: 'registry',
              required: true,
              attributes: ['id']
            }
          ],
          attributes: ['picture', 'category']
        },
        {
          model: Application,
          as: 'application',
          required: false,
          attributes: ['isActivated']
        }
      ],
      where: {
        iofogUuid: iofogUuid,
        [Op.or]:
          [
            {
              '$application.is_activated$': true
            },
            {
              '$catalogItem.category$': { [Op.eq]: 'SYSTEM' },
              '$catalogItem.id$': { [Op.ne]: 1 }
            }
          ]

      }
    }, { transaction: transaction })
  }

  findOneWithDependencies (where, attributes, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: MicroserviceEnv,
          as: 'env',
          required: false,
          attributes: ['key', 'value']
        },
        {
          model: MicroserviceExtraHost,
          as: 'extraHosts',
          required: false
        },
        {
          model: MicroserviceArg,
          as: 'cmd',
          required: false,
          attributes: ['cmd']
        },
        {
          model: MicroservicePort,
          as: 'ports',
          required: false,
          attributes: ['portInternal', 'portExternal']
        },
        {
          model: VolumeMapping,
          as: 'volumeMappings',
          required: false,
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type']
        },
        {
          model: StraceDiagnostics,
          as: 'strace',
          required: false,
          attributes: ['straceRun']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'fogTypeId']
        },
        {
          model: Registry,
          as: 'registry',
          required: false,
          attributes: ['id']
        },
        {
          model: CatalogItem,
          as: 'catalogItem',
          required: false,
          include: [{
            model: CatalogItemImage,
            as: 'images',
            attributes: ['containerImage', 'fogTypeId']
          }],
          attributes: ['picture', 'registryId']
        },
        {
          model: Fog,
          as: 'iofog',
          required: false,
          attributes: ['daemonStatus']
        },
        {
          model: Routing,
          as: 'routes',
          required: false,
          include: [{
            model: Microservice,
            as: 'destMicroservice',
            attributes: ['uuid']
          }],
          attributes: { exclude: ['id',
            'sourceMicroserviceUuid', 'destMicroserviceUuid',
            'sourceNetworkMicroserviceUuid', 'destNetworkMicroserviceUuid',
            'sourceIofogUuid', 'destIofogUuid'] }
        }
      ],
      where: where,
      attributes: attributes
    }, { transaction: transaction })
  }

  findOneWithStatusAndCategory (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: MicroserviceStatus,
          as: 'microserviceStatus',
          required: false
        },
        {
          model: CatalogItem,
          as: 'catalogItem',
          attributes: ['category']
        }
      ],
      where: where
    }, { transaction: transaction })
  }

  findAllWithStatuses (where, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: MicroserviceStatus,
          as: 'microserviceStatus',
          required: false
        }
      ],
      where: where
    }, { transaction: transaction })
  }

  findMicroserviceOnGet (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: Application,
          as: 'application',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true,
              attributes: ['id']
            }
          ],
          attributes: ['id']
        }
      ],
      where: where,
      attributes: ['uuid']
    }, { transaction: transaction })
  }

  async findOneExcludeFields (where, transaction) {
    return Microservice.findOne({
      where: where,
      attributes: {
        exclude: microserviceExcludedFields
      } }, {
      transaction: transaction
    })
  }

  async findAllExcludeFields (where, transaction) {
    return Microservice.findAll({
      where: where,
      order: [ [ 'name', 'ASC' ] ],
      attributes: {
        exclude: microserviceExcludedFields
      } }, {
      transaction: transaction
    })
  }

  findOneWithCategory (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: CatalogItem,
          as: 'catalogItem',
          required: false,
          attributes: ['category']
        }
      ],
      where: where
    }, { transaction: transaction })
  }
}

const instance = new MicroserviceManager()
module.exports = instance
