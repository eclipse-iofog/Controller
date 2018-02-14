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


/********************************************* EndPoints ******************************************************/
const containerListEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params= {},
      instanceProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'elementInstances'
      };
  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    //async.apply(DataTracksService.findContainerListByInstanceId, dataTrackProps, params),
    async.apply(ElementInstanceService.getElementInstancesByFogIdOptional, instanceProps, params),
    setViewerOrDebug

  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'containerlist', params.containerList, result);
  })
}
/************************************* Extra Functions **************************************************/
const setViewerOrDebug = function(params, callback){
  let elementInstances = params.elementInstances;
  params.containerList = [];

  async.forEachLimit(elementInstances, 1, function(elementInstance, next){
    let container = elementInstance;
    container.rebuildFlag = false;
    container.rootAccessFlag = false;
    container.ports = [];

    container.isViewerOrDebug = elementInstance.uuid;
    container.last_updated = elementInstance.updated_at;

    if (container.isStreamViewer > 0) container.isViewerOrDebug = "viewer";
    if (container.isDebugConsole > 0) container.isViewerOrDebug = "debug";
  
   params.container = container;

    let updateElementInstanceProps = {
          elementId: 'container.uuid',
          updatedData: {
            rebuild: 0
          }
        },
        elementProps = {
          elementId: 'container.element_key',
          setProperty: 'elementData'
        },
        elementPortProps = {
          elementPortId: 'container.uuid',
          setProperty: 'elementInstancePort'
        };

    async.waterfall([
      async.apply(ElementInstanceService.updateElemInstance, updateElementInstanceProps, params),
      async.apply(ElementService.findElementAndRegistryById, elementProps),
      processContainerListData,
      async.apply(ElementInstancePortService.getPortsByElementId, elementPortProps),
      processContainerListOutput
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
const processContainerListData = function(params, callback) {
  let newContainerItem = {
    id: params.container.isViewerOrDebug,
    lastmodified: Date.parse(params.container.last_updated),
    rebuild: params.container.rebuild > 0 ? true : false,
    roothostaccess: params.container.rootHostAccess > 0 ? true : false,
    logsize: parseFloat(params.container.logSize),
    imageid: params.elementData.containerImage,
    registryurl: params.elementData.registry.url,
  };
  params.newContainerItem = newContainerItem;
  callback(null, params);
}
const processContainerListOutput = function(params, callback) {
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