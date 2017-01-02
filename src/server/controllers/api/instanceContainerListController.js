/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-containerList end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();
import DataTracksManager from '../../managers/dataTracksManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ElementManager from '../../managers/elementManager';
import BaseApiController from './baseApiController';
import Registry from '../../models/registry';
import ElementInstancePortManager from '../../managers/elementInstancePortManager';

import InstanceTrackService from '../../services/instanceTrackService';

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';
import _ from 'underscore';


router.get('/api/v2/instance/containerlist/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
	containerList(req, res);
});

router.post('/api/v2/instance/containerlist/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  	containerList(req, res);
});


const containerList= function(req, res){
  var instanceId = req.params.ID,
      token = req.params.Token,
      containerList = [];
  /**
   * @desc - if instanceTrack are found, this function populates a containerList 
   * with elementInstances and a sub-list of there respective ports
   * @param Integer - instanceId
   * @return - returns an appropriate response to the client
   */
  DataTracksManager.findContainerListByInstanceId(instanceId)
    .then((instanceContainer) => {
      if (instanceContainer) {        
        for (let i = 0; i < instanceContainer.length; i++) {
          var container = instanceContainer[i];
          container.rebuildFlag = false;
          container.rootAccessFlag = false;
          container.ports = [];

          container.isViewerOrDebug = instanceContainer[i].UUID;
          container.last_updated = instanceContainer[i].updated_at;

          if (container.is_stream_viewer > 0) container.isViewerOrDebug = "viewer";
          if (container.is_debug_console > 0) container.isViewerOrDebug = "debug";
          // *
          //  * @desc - async.waterfall control flow, sequential calling of an Array of functions.
          //  * @param Array - [resetElementInstanceRebuild, findElement, getElmentPorts]
          //  * @return - returns an appropriate response to the client
           
          async.waterfall([
            async.apply(resetElementInstanceRebuild, container, containerList),
            findElement,
            getElementPorts,
          ], function(err, result) {
            if (err) {
              if (i === (instanceContainer.length - 1)) {
                res.send({
                  'status': 'failure',
                  'timestamp': new Date().getTime(),
                  'errormessage': result
                });
              }
            } else {
              res.status(200);
              if (i === (instanceContainer.length - 1)) {
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
          'status': 'failure',
          'timestamp': new Date().getTime(),
          'errormessage': "container not found"
        });
      }
    }, (err) => {
      console.log("err in finding track");
      console.log(err);
      callback('error', Constants.MSG.SYSTEM_ERROR);
    });
};

/**
 * @desc - if the container needs to be rebuild, it sets the rebuild value to 0 and calls
 * the findElement function
 * @param - container, containerList, callback
 * @return - none
 */
function resetElementInstanceRebuild(container, containerList, callback) {
  if (container.rebuild > 0) {
    ElementInstanceManager.updateByUUID(container.UUID, {
        rebuild: 0
      })
      .then((result) => {
        callback(null, container, containerList);
      }, (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
  } else {
    callback(null, container, containerList);
  }
}
/**
 * @desc - if the element are found in the database with there respective registrys this function
 * populates an object with the information and forwards to the getElementPorts function
 * @param - container, containerList, callbac
 * @return - none
 */
function findElement(container, containerList, callback) {
  var newContainerItem = {
    id: container.isViewerOrDebug,
    lastmodified: container.last_updated,
    rebuild: container.rebuild > 0 ? true : false,
    roothostaccess: container.root_host_access > 0 ? true : false,
    logsize: parseFloat(container.log_size),
  }

  ElementManager.findElementAndRegistryById(container.element_key)
    .then((elementRegistry) => {
      if (elementRegistry) {
        newContainerItem.imageid = elementRegistry.containerImage;
        newContainerItem.registryurl = elementRegistry.registry.url;
        callback(null, container, newContainerItem, containerList, elementRegistry);
      } else {
        // call error
        callback('error', Constants.MSG.ERROR_CONTAINER_IMAGE);
      }

    }, (err) => {
      callback('error', Constants.MSG.SYSTEM_ERROR);
    });
}
/**
 * @desc - if the elementInstancePorts exists in the database this function inserts the elements 
 * inside the containerList and inserts the ports as a sublist to each coresponding element. 
 * @param - provisionKey, fabricType, callback
 * @return - none
 */
function getElementPorts(container, newContainerItem, containerList, elementRegistry, callback) {
  ElementInstancePortManager.getPortsByElementId(elementRegistry.id)
    .then((elementPorts) => {
      if (elementPorts && elementPorts.length > 0) {
        for (let i = 0; i < elementPorts.length; i++) {
          let OutputPortItem = {
            outsidecontainer: (elementPorts[i].portexternal).toString(),
            insidecontainer: (elementPorts[i].portinternal).toString()
          };
          container.ports.push(OutputPortItem);
        }
      }
      newContainerItem.portmappings = container.ports;
      containerList.push(newContainerItem);
      callback(null, containerList);
    }, (err) => {
      callback('error', Constants.MSG.SYSTEM_ERROR);
    });
}

export default router;