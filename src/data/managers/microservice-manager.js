const BaseManager = require('./base-manager')
const models = require('../models')
const Microservice = models.Microservice
const MicroservicePort = models.MicroservicePort
const MicroserviceEnv = models.MicroserviceEnv
const MicroserviceExtraHost = models.MicroserviceExtraHost
const MicroserviceArg = models.MicroserviceArg
const MicroserviceCdiDev = models.MicroserviceCdiDev
const MicroserviceCapAdd = models.MicroserviceCapAdd
const MicroserviceCapDrop = models.MicroserviceCapDrop
const VolumeMapping = models.VolumeMapping
const MicroserviceEntrypoint = models.MicroserviceEntrypoint
const MicroserviceDevice = models.MicroserviceDevice
const MicroserviceTmpfs = models.MicroserviceTmpfs
const MicroserviceUlimit = models.MicroserviceUlimit
const MicroserviceModel = models.MicroserviceModel
const MicroserviceModelItem = models.MicroserviceModelItem
const CatalogItem = models.CatalogItem
const CatalogItemImage = models.CatalogItemImage
const Fog = models.Fog
const Application = models.Application
const Registry = models.Registry
const MicroserviceStatus = models.MicroserviceStatus
const MicroserviceExecStatus = models.MicroserviceExecStatus
const MicroserviceHealthCheck = models.MicroserviceHealthCheck
const RbacServiceAccount = models.RbacServiceAccount
const Op = require('sequelize').Op

const microserviceExcludedFields = [
  'configLastUpdated',
  'created_at',
  'updated_at',
  'updatedBy',
  'rebuild',
  'deleteWithCleanUp',
  'catalog_item_id',
  'iofog_uuid'
]

function containerChildIncludes () {
  return [
    {
      model: MicroserviceEntrypoint,
      as: 'entrypoint',
      required: false,
      attributes: ['id', 'entrypoint']
    },
    {
      model: MicroserviceDevice,
      as: 'devices',
      required: false,
      attributes: ['id', 'hostPath', 'containerPath', 'permissions']
    },
    {
      model: MicroserviceTmpfs,
      as: 'tmpfs',
      required: false,
      attributes: ['id', 'containerPath', 'size', 'mode']
    },
    {
      model: MicroserviceUlimit,
      as: 'ulimits',
      required: false,
      attributes: ['id', 'name', 'soft', 'hard']
    },
    {
      model: MicroserviceModel,
      as: 'microserviceModel',
      required: false,
      attributes: ['bindPath', 'permissions']
    },
    {
      model: MicroserviceModelItem,
      as: 'modelItems',
      required: false,
      attributes: ['id', 'name']
    }
  ]
}

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
        ...containerChildIncludes(),
        {
          model: MicroserviceCdiDev,
          as: 'cdiDevices',
          required: false,
          attributes: ['cdiDevices']
        },
        {
          model: MicroserviceCapAdd,
          as: 'capAdd',
          required: false,
          attributes: ['capAdd']
        },
        {
          model: MicroserviceCapDrop,
          as: 'capDrop',
          required: false,
          attributes: ['capDrop']
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
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type', 'scope']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'archId']
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
            attributes: ['containerImage', 'archId']
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
          model: MicroserviceHealthCheck,
          as: 'healthCheck',
          required: false,
          attributes: ['test', 'interval', 'timeout', 'startPeriod', 'startInterval', 'retries']
        },
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
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
        ...containerChildIncludes(),
        {
          model: MicroserviceCdiDev,
          as: 'cdiDevices',
          required: false,
          attributes: ['cdiDevices']
        },
        {
          model: MicroserviceCapAdd,
          as: 'capAdd',
          required: false,
          attributes: ['capAdd']
        },
        {
          model: MicroserviceCapDrop,
          as: 'capDrop',
          required: false,
          attributes: ['capDrop']
        },
        {
          model: MicroservicePort,
          as: 'ports',
          required: false,
          attributes: ['portInternal', 'portExternal', 'isUdp']
        },
        {
          model: VolumeMapping,
          as: 'volumeMappings',
          required: false,
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type', 'scope']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'archId']
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
              attributes: ['containerImage', 'archId']
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
        },
        {
          model: MicroserviceHealthCheck,
          as: 'healthCheck',
          required: false,
          attributes: ['test', 'interval', 'timeout', 'startPeriod', 'startInterval', 'retries']
        },
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where: {
        iofogUuid,
        [Op.or]:
          [
            {
              [Op.and]: [
                { '$application.is_activated$': true },
                { isActivated: true }
              ]
            },
            {
              '$catalogItem.category$': { [Op.eq]: 'SYSTEM' },
              '$catalogItem.id$': { [Op.ne]: 1 }
            }
          ]

      }
    }, { transaction })
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
        ...containerChildIncludes(),
        {
          model: MicroserviceCdiDev,
          as: 'cdiDevices',
          required: false,
          attributes: ['cdiDevices']
        },
        {
          model: MicroserviceCapAdd,
          as: 'capAdd',
          required: false,
          attributes: ['capAdd']
        },
        {
          model: MicroserviceCapDrop,
          as: 'capDrop',
          required: false,
          attributes: ['capDrop']
        },
        {
          model: MicroservicePort,
          as: 'ports',
          required: false,
          attributes: ['portInternal', 'portExternal', 'isUdp']
        },
        {
          model: VolumeMapping,
          as: 'volumeMappings',
          required: false,
          attributes: ['hostDestination', 'containerDestination', 'accessMode', 'type', 'scope']
        },
        {
          model: CatalogItemImage,
          as: 'images',
          required: false,
          attributes: ['containerImage', 'archId']
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
            attributes: ['containerImage', 'archId']
          }],
          attributes: ['picture', 'registryId', 'category']
        },
        {
          model: Fog,
          as: 'iofog',
          required: false,
          attributes: ['daemonStatus']
        },
        {
          model: MicroserviceHealthCheck,
          as: 'healthCheck',
          required: false,
          attributes: ['test', 'interval', 'timeout', 'startPeriod', 'startInterval', 'retries']
        },
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where,
      attributes
    }, { transaction })
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
      where
    }, { transaction })
  }

  async findAllWithStatuses (where, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: MicroserviceStatus,
          as: 'microserviceStatus',
          required: false
        },
        {
          model: MicroserviceExecStatus,
          as: 'microserviceExecStatus',
          required: false
        }
      ],
      where
    }, { transaction })
  }

  async findDistinctFogUuids (where, transaction) {
    const rows = await Microservice.findAll({
      attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('iofog_uuid')), 'iofogUuid']],
      where,
      order: [[models.sequelize.col('iofog_uuid'), 'ASC']],
      raw: true,
      transaction
    })
    return rows.map((row) => row.iofogUuid).filter(Boolean)
  }

  findMicroserviceOnGet (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: Application,
          as: 'application',
          required: true,
          where: {
            isSystem: false
          },
          attributes: ['id']
        }
      ],
      where,
      attributes: ['uuid']
    }, { transaction })
  }

  findSystemMicroserviceOnGet (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: Application,
          as: 'application',
          required: true,
          where: {
            isSystem: true
          },
          attributes: ['id']
        }
      ],
      where,
      attributes: ['uuid']
    }, { transaction })
  }

  async findOneExcludeFields (where, transaction) {
    return Microservice.findOne({
      include: [
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where,
      attributes: {
        exclude: microserviceExcludedFields
      }
    }, { transaction })
  }

  async findAllExcludeFields (where, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: Application,
          as: 'application',
          required: true,
          where: { isSystem: false }
        },
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where,
      order: [['name', 'ASC']],
      attributes: {
        exclude: microserviceExcludedFields
      }
    }, { transaction })
  }

  async findAllSystemExcludeFields (where, transaction) {
    return Microservice.findAll({
      include: [
        {
          model: Application,
          as: 'application',
          required: true,
          where: { isSystem: true }
        },
        {
          model: RbacServiceAccount,
          as: 'serviceAccount',
          required: false
        }
      ],
      where,
      order: [['name', 'ASC']],
      attributes: {
        exclude: microserviceExcludedFields
      }
    }, { transaction })
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
      where
    }, { transaction })
  }
}

const instance = new MicroserviceManager()
module.exports = instance
