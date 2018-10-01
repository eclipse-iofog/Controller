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

/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-containerList end-point
 */
const async = require('async');

const BaseApiController = require('./baseApiController');
const DataTracksService = require('../../services/dataTracksService');
const ElementService = require('../../services/elementService');
const ElementInstancePortService = require('../../services/elementInstancePortService');
const ElementInstanceService = require('../../services/elementInstanceService');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const ElementInstanceToCleanUpService = require('../../services/elementInstanceToCleanUpService');


/********************************************* EndPoints ******************************************************/
const containerListEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
        dataTrackProps = {
            instanceId: 'bodyParams.ID',
            setProperty: 'elementInstances'
        },
        fogParam = {
            uuid: 'bodyParams.ID',
            setProperty: 'cleanUpElements'
        },
        data = {
            elementInstanceData: 'elementIds',
            setProperty: 'elementIds'
        };
  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(DataTracksService.findContainerListByInstanceId, dataTrackProps, params),
      processContainerList,
      async.apply(ElementInstanceToCleanUpService.listByFogUUID, fogParam, params),
      async.apply(ElementInstanceToCleanUpService.deleteByFogUUID, fogParam, params),
      async.apply(ElementInstanceService.deleteElementInstancesByUUID, data, params)
  ], function(err, result) {
      let containerList = [];
      for (let i = 0, len = params.containerList.length; i < len; i++) {
          if (!params.elementToCleanUpIds.includes(params.containerList[i].id)) {
              containerList.push(params.containerList[i])
          }
      }
      let successLabelArr = ['containerlist', 'elementToCleanUpIds'],
          successValueArr = [containerList, params.elementToCleanUpIds];

      AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  })
}
/************************************* Extra Functions **************************************************/
const processContainerList = function(params, callback){
  let elementInstances = params.elementInstances;
  params.containerList = [];

  async.forEachLimit(elementInstances, 1, function(elementInstance, next){

   params.container = elementInstance;
   params.container.ports = [];

    let updateElementInstanceProps = {
          elementId: 'container.UUID',
          updatedData: {
            rebuild: 0,
            needUpdate: 0
          }
        },
        elementProps = {
          elementId: 'container.element_id',
          instanceId: 'bodyParams.ID',
          setProperty: 'elementData'
        },
        elementPortProps = {
          elementPortId: 'container.UUID',
          setProperty: 'elementInstancePort'
        };

    async.waterfall([
      async.apply(ElementInstanceService.updateElemInstance, updateElementInstanceProps, params),
      async.apply(ElementService.findElementImageAndRegistryByIdForFogInstance, elementProps),
      processContainerData,
      async.apply(ElementInstancePortService.getPortsByElementId, elementPortProps),
      processContainerPorts
    ], function(err, result) {
      if (err){
        callback(err, result);
      }
      else{
        next(null, params);
      }
      })
    }, function(err, result) {
        callback(null, params);
  });
}
const processContainerData = function(params, callback) {
  let newContainerItem = {
    id: params.container.UUID,
    lastmodified: Date.parse(params.container.updated_at),
    rebuild: params.container.rebuild > 0,
    roothostaccess: params.container.root_host_access > 0,
    logsize: parseFloat(params.container.log_size),
    imageid: params.elementData.containerImage,
    registryurl: params.elementData.registryUrl,
    volumemappings: params.container.volume_mappings,
    imagesnapshot: params.container.image_snapshot,
    needupdate: params.container.need_update > 0
  };
  params.newContainerItem = newContainerItem;
  callback(null, params);
}
const processContainerPorts = function(params, callback) {
try{
  for (let j = 0; j < params.elementInstancePort.length; j++) {
    let outputPortItem = {
        outsidecontainer: (params.elementInstancePort[j].portexternal).toString(),
        insidecontainer: (params.elementInstancePort[j].portinternal).toString()
      };
    params.container.ports.push(outputPortItem);
  }
  params.newContainerItem.portmappings = params.container.ports;

  params.containerList.push(params.newContainerItem);
  callback(null, params);
}catch(e){
  logger.error(e);
}
}
module.exports =  {
  containerListEndPoint: containerListEndPoint
};