import RoutingManager from '../managers/routingManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createRoute = function(props, params, callback) {
  var routingObj = {
    publishing_instance_id: AppUtils.getProperty(params, props.publishingInstanceId),
    destination_instance_id: AppUtils.getProperty(params, props.destinationInstanceId),
    publishing_element_id: AppUtils.getProperty(params, props.publishingElementId),
    destination_element_id: AppUtils.getProperty(params, props.destinationElementId),
    isNetworkConnection: props.isNetworkConnection
  };

  RoutingManager
    .create(routingObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Routing Object', callback));
}

const deleteByFogAndElement = function(props, params, callback) {
  var instanceId1 = AppUtils.getProperty(params, props.instanceId1),
    instanceId2 = AppUtils.getProperty(params, props.instanceId2),
    elementId1 = AppUtils.getProperty(params, props.elementId1),
    elementId2 = AppUtils.getProperty(params, props.elementId2),
    isNetwork = props.isNetwork;

  RoutingManager
    .deleteByFogAndElement(instanceId1, instanceId2, elementId1, elementId2, isNetwork)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance Routing found', callback));
}

const deleteElementInstanceRouting = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  RoutingManager
    .deleteByPublishingElementId(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Routing found', callback));
}

const deleteNetworkElementRouting = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  RoutingManager
    .deleteByNetworkElementInstanceId(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance Routing found', callback));
}

const extractDifferentRoutingList = function(params, callback) {
  let intraRoutingList = [];
  let extraRoutingList = [];
  let otherRoutingList = [];

  params.elementInstance.forEach((instance) => {
    params.routing.forEach((route) => {
      if (route.publishing_instance_id != instance.iofog_uuid || route.is_network_connection === 1) {
        otherRoutingList.push(route);
      } else if (route.track_id != instance.trackId) {
        extraRoutingList.push(route);
      } else {
        intraRoutingList.push(route);
      }
    });
  });

  params.intraRoutingList = _.uniq(intraRoutingList, function(routing) {
    return routing.ID;
  });
  params.extraRoutingList = _.uniq(extraRoutingList, function(routing) {
    return routing.ID;
  });
  params.otherRoutingList = _.uniq(otherRoutingList, function(routing) {
    return routing.ID;
  });
  callback(null, params);
}

const extractDifferentOutputRoutingList = function(params, callback) {

  let outputIntraRoutingList = [];
  let outputExtraRoutingList = [];
  let outputOtherRoutingList = [];

  params.elementInstance.forEach((instance) => {
    params.routing.forEach((route) => {
      if (route.destination_element_id != instance.iofog_uuid || route.is_network_connection === 1) {
        outputOtherRoutingList.push(route);
      } else if (route.track_id != instance.trackId) {
        outputExtraRoutingList.push(route);
      } else {
        outputIntraRoutingList.push(route);
      }
    });
  });

  params.outputIntraRoutingList = _.uniq(outputIntraRoutingList, function(routing) {
    return routing.ID;
  });
  params.outputExtraRoutingList = _.uniq(outputExtraRoutingList, function(routing) {
    return routing.ID;
  });
  params.outputOtherRoutingList = _.uniq(outputOtherRoutingList, function(routing) {
    return routing.ID;
  });
  callback(null, params);
}

const findByInstanceId = function(props, params, callback) {
   var instanceId = AppUtils.getProperty(params, props.instanceId);

  RoutingManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'instanceId not found in routing.', callback));
}

const findByElementInstanceUuidsAndRoutingDestination = function(props, params, callback) {
  var elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

   RoutingManager
    .findByElementInstanceUuidsAndRoutingDestination(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Routing not found.', callback));
}

const findOutputRoutingByElementInstanceUuidsAndRoutingPublishing = function(props, params, callback) {
  var elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  RoutingManager
    .findOutputRoutingByElementInstanceUuidsAndRoutingPublishing(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'outputRouting not found.', callback));
}

export default {
  createRoute: createRoute,
  deleteByFogAndElement: deleteByFogAndElement,
  deleteElementInstanceRouting: deleteElementInstanceRouting,
  deleteNetworkElementRouting: deleteNetworkElementRouting,
  extractDifferentRoutingList: extractDifferentRoutingList,
  extractDifferentOutputRoutingList: extractDifferentOutputRoutingList,
  findByElementInstanceUuidsAndRoutingDestination: findByElementInstanceUuidsAndRoutingDestination,
  findByInstanceId: findByInstanceId,
  findOutputRoutingByElementInstanceUuidsAndRoutingPublishing: findOutputRoutingByElementInstanceUuidsAndRoutingPublishing
};
