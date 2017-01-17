/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-containerList end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();

import BaseApiController from './baseApiController';
import DataTracksService from '../../services/dataTracksService';
import ElementService from '../../services/elementService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import AppUtils from '../../utils/appUtils';

router.get('/api/v2/instance/containerlist/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
	containerList(req, res);
});

router.post('/api/v2/instance/containerlist/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  	containerList(req, res);
});
const containerList= function(req, res){
  var params= {},
      dataTrackProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'dataTracks'
      };
  params.bodyParams = req.params;

  async.waterfall([
    async.apply(DataTracksService.findContainerListByInstanceId, dataTrackProps, params),
    setViewerOrDebug

  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'containerlist', params.containerList, result);
  })
}
const setViewerOrDebug = function(params, callback){
  var dataTracks = params.dataTracks;
  params.containerList = [];

  async.forEachLimit(dataTracks, 1, function(dataTrack, next){
    var container = dataTrack;
    container.rebuildFlag = false;
    container.rootAccessFlag = false;
    container.ports = [];

    container.isViewerOrDebug = dataTrack.UUID;
    container.last_updated = dataTrack.updated_at;

    if (container.is_stream_viewer > 0) container.isViewerOrDebug = "viewer";
    if (container.is_debug_console > 0) container.isViewerOrDebug = "debug";
  
   params.container = container;

    var updateElementInstanceProps = {
          elementId: 'container.UUID',
          updatedData: {
            rebuild: 0
          }
        },
        elementProps = {
          elementId: 'container.element_key',
          setProperty: 'elementData'
        },
        elementPortProps = {
          elementPortId: 'container.UUID',
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
  var newContainerItem = {
    id: params.container.isViewerOrDebug,
    lastmodified: Date.parse(params.container.last_updated),
    rebuild: params.container.rebuild > 0 ? true : false,
    roothostaccess: params.container.root_host_access > 0 ? true : false,
    logsize: parseFloat(params.container.log_size),
    imageid: params.elementData.containerImage,
    registryurl: params.elementData.registry.url,
  };
  params.newContainerItem = newContainerItem;
  callback(null, params);
}
const processContainerListOutput = function(params, callback) {

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
}

export default router;