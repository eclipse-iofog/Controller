/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseManager = require('./base-manager');
const models = require('./../models');
const Microservice = models.Microservice;
const MicroservicePort = models.MicroservicePort;
const VolumeMapping = models.VolumeMapping;
const StraceDiagnostics = models.StraceDiagnostics;
const CatalogItem = models.CatalogItem;
const CatalogItemImage = models.CatalogItemImage;
const Fog = models.Fog;
const Routing = models.Routing;

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
        attributes: ['straceRun']
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
        attributes: {exclude: ['id', 'source_microservice_uuid',
            'sourceMicroserviceUuid', 'destMicroserviceUuid', 'sourceNetworkMicroserviceUuid',
            'destNetworkMicroserviceUuid', 'sourceIofogUuid', 'destIofogUuid', 'connectorPortId']}
      }
      ],
      where: where,
      attributes: attributes
    }, {transaction: transaction})
  }

  findOneWithDependencies(where, attributes, transaction) {
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
        attributes: ['straceRun']
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
        attributes: {exclude: ['id', 'source_microservice_uuid',
                'sourceMicroserviceUuid', 'destMicroserviceUuid',
                'sourceNetworkMicroserviceUuid', 'destNetworkMicroserviceUuid',
                'sourceIofogUuid', 'destIofogUuid', 'connectorPortId']}
      }
      ],
      where: where,
      attributes: attributes
    }, {transaction: transaction})
  }
}

const instance = new MicroserviceManager();
module.exports = instance;