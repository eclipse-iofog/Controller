const BaseManager = require('./base-manager');
const models = require('./../models');
const Microservice = models.Microservice;
const MicroservicePort = models.MicroservicePort;
const VolumeMapping = models.VolumeMapping;
const StraceDiagnostics = models.StraceDiagnostics;
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
      },
      {
        model: StraceDiagnostics,
        as: 'strace',
        required: false,
        attribures: ['straceRun']
      }/*,
      {
        model: CatalogItem,
        as: 'catalogItem',
        required: false,
        attributes: ['images']
      },
      {
        model: CatalogItem,
        as: 'catalogItem',
        required: false,
        attributes: ['picture']
      }*/

      // TODO: get images, picture, routes
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
      },
      {
        model: StraceDiagnostics,
        as: 'strace',
        required: false,
        attribures: ['straceRun']
      }/*,
      {
        model: CatalogItem,
        as: 'catalogItem',
        required: false,
        attributes: ['images']
      },
      {
        model: CatalogItem,
        as: 'catalogItem',
        required: false,
        attributes: ['picture']
      }*/
      // TODO: get images, picture, routes
      ],
      where: where,
      attributes: attribures
    }, transaction)
  }
}

const instance = new MicroserviceManager();
module.exports = instance;