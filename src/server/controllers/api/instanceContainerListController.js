/**
* @file instanceContainerListController.js
* @author Zishan Iqbal
* @description This file includes the implementation of the instance-containerList end-point
*/
import async from 'async';
import express from 'express';
const router = express.Router();
import InstanceTrackManager from '../../managers/instanceTrackManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ElementManager from '../../managers/elementManager';
import BaseApiController from './baseApiController';
import Registry from '../../models/registry';
import ElementInstancePortManager from '../../managers/elementInstancePortManager'

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

// Get IoFabric Config
router.get('/api/v2/instance/containerlist/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID,
    token = req.params.Token,
    containerList = [];

  InstanceTrackManager.findInstanceContainer(instanceId)
  .then((instanceContainer) => {
    if(instanceContainer && instanceContainer[0] && instanceContainer[0].length > 0) {
      var instanceContainerList = instanceContainer[0];
      for(let i = 0; i < instanceContainerList.length; i++) {
        var container = instanceContainerList[i];
        container.rebuildFlag = false;
        container.rootAccessFlag = false;
        container.ports = [];

        if(container.is_stream_viewer > 0) container.isViewerOrDebug = "viewer";
        if(container.is_debug_console > 0) container.isViewerOrDebug = "debug";

        async.waterfall([
          async.apply(resetElementInstanceRebuild, container, containerList),
          findElement,
          getElementPorts,
        ], function(err, result) {
          if (err) {
            if(i === (instanceContainerList.length -1)) {
              res.send({
                'status':'failure',
                'timestamp': new Date().getTime(),
                'errormessage': result
              });
            }
          } else {
            res.status(200);
            if(i === (instanceContainerList.length - 1)) {
              res.send({
                status: "ok",
                timestamp: new Date().getTime(),
                containerlist: result
              });
            }
          }
        });
      }
    } else {
      res.send({
        'status':'failure',
        'timestamp': new Date().getTime(),
        'errormessage': "container not found"
      });
    }
  }, (err) => {
    console.log("err in finding track");
    console.log(err);
    callback('error', Constants.MSG.SYSTEM_ERROR);
  });
});

function resetElementInstanceRebuild (container, containerList, callback) {
  if(container.rebuild > 0) {
    ElementInstanceManager.updateByUUID(container.UUID, {rebuild: 0})
    .then((result) => {
      callback(null, container, containerList);
    }, (err) => {
      callback('error', Constants.MSG.SYSTEM_ERROR);
    });
  } else {
    callback(null, container, containerList);
  }
}

function findElement (container, containerList, callback) {
  var newContainerItem = {
    id: container.isViewerOrDebug,
    lastmodified: parseFloat(container.last_updated),
    rebuild: container.rebuild > 0 ? true : false,
    roothostaccess: container.root_host_access > 0 ? true: false,
    logsize: parseFloat(container.log_size),
  }
  
  ElementManager.findById(container.element_key, [Registry])
  .then((elementRegistry) => {
    if(elementRegistry) {
      newContainerItem.imageid = elementRegistry.containerImage;
      newContainerItem.registry_url = elementRegistry.registry.url;
      callback(null, container, newContainerItem, containerList, elementRegistry);
    } else {
      // call error
      callback('error', Constants.MSG.ERROR_CONTAINER_IMAGE);
    }

  }, (err) => {
    callback('error', Constants.MSG.SYSTEM_ERROR);
  });
}

function getElementPorts (container, newContainerItem, containerList, elementRegistry, callback) {
  ElementInstancePortManager.getPortsByElementId(elementRegistry.id)
  .then((elementPorts) => {
    if(elementPorts && elementPorts.length > 0) {
      for(let i = 0; i < elementPorts.length; i++) {
        let OutputPortItem  = {
          outsidecontainer: elementPorts[i].portExternal,
          insidecontainer: elementPorts[i].portInternal
        };
        container.ports.push(OutputPortItem);
      }
    }
    newContainerItem.portMappings = container.ports;
    containerList.push(newContainerItem);
    callback(null, containerList);
  }, (err) => {
    callback('error', Constants.MSG.SYSTEM_ERROR);
  });
}

export default router;