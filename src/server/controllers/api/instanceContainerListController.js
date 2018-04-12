/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-containerList end-point
 */
import async from 'async';

import BaseApiController from './baseApiController';
import DataTracksService from '../../services/dataTracksService';
import ElementService from '../../services/elementService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import ElementInstanceToCleanUpService from "../../services/elementInstanceToCleanUpService";


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
            rebuild: 0
          }
        },
        elementProps = {
          elementId: 'container.element_key',
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
    volumemappings: params.container.volume_mappings
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
export default {
  containerListEndPoint: containerListEndPoint
};