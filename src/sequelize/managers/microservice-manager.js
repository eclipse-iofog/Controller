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

    /* Return:
   + uuid
   + name
   + config
     images
     picture
     status
   + ioFogNodeId
   + isNetwork
   + needUpdate
   + rebuild
   + rootHostAccess
   + deleteWithCleanUp
   + strace
   + imageSnapshot
   + logLimit
   + volumeMappings
   + ports
     routes */

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


    /* Return:
     + uuid
     + name
     + config
       images
       picture
       status
     + ioFogNodeId
     + isNetwork
     + needUpdate
     + rebuild
     + rootHostAccess
     + deleteWithCleanUp
     + strace
     + imageSnapshot
     + logLimit
     + volumeMappings
     + ports
       routes */
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