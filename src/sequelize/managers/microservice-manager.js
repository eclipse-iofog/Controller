const BaseManager = require('./base-manager');
const models = require('./../models');
const Microservice = models.Microservice;
const MicroservicePort = models.MicroservicePort;
const VolumeMapping = models.VolumeMapping;
const CatalogItem = models.CatalogItem;

class MicroserviceManager extends BaseManager {
  getEntity() {
    return Microservice
  }

  findAllWithDependencies(where, attributes, transaction) {
    return Microservice.findAll({
      include: [
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
        attributes: ['hostDestination', 'containerDestination', 'accessMode']
      }
      /*{
        model: CatalogItem,
        as: 'images',
          required: false,
          attributes: ['images']
      },
      {
        model: CatalogItem,
        as: 'picture',
          required: false,
          attributes: ['picture']
      }*/

      // TODO: get images, picture, strace, routes
      ],
      where: where,
      attributes: attributes
    }, transaction)
  }

  findOneWithDependencies(where, attribures, transaction) {
    return Microservice.findOne({
      include: [
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
        attributes: ['hostDestination', 'containerDestination', 'accessMode']
      }
          // TODO: get images, picture, strace, routes
      ],
      where: where,
      attributes: attribures
    }, transaction)
  }
}

const instance = new MicroserviceManager();
module.exports = instance;