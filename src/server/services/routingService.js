import RoutingManager from '../managers/routingManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createRoute = function(props, params, callback) {
  console.log(props);

  var routingObj = {
    publishing_instance_id: AppUtils.getProperty(params, props.publishingInstanceId),
    destination_instance_id: AppUtils.getProperty(params, props.destinationInstanceId),
    publishing_element_id: AppUtils.getProperty(params, props.publishingElementId),
    destination_element_id: AppUtils.getProperty(params, props.destinationElementId),
    isNetworkConnection: props.isNetworkConnection
  };

  console.log(routingObj);

  RoutingManager
    .create(routingObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Routing Object', callback));
}

const findByElementInstanceUuids = function(params, callback) {
  RoutingManager
    .findByElementInstanceUuids(_.pluck(params.elementInstance, 'uuid'))
    .then(AppUtils.onFind.bind(null, params, 'routing', 'Routing not found.', callback));
}

const findOutputRoutingByElementInstanceUuids = function(params, callback) {
  RoutingManager
    .findOutputRoutingByElementInstanceUuids(_.pluck(params.elementInstance, 'uuid'))
    .then(AppUtils.onFind.bind(null, params, 'outputRouting', 'outputRouting not found.', callback));
}

const findByElementInstanceUuidsAndRoutingDestination = function(params, callback) {
   RoutingManager
    .findByElementInstanceUuidsAndRoutingDestination(_.pluck(params.elementInstance, 'uuid'))
    .then(AppUtils.onFind.bind(null, params, 'routing', 'Routing not found.', callback));
}

const findOutputRoutingByElementInstanceUuidsAndRoutingPublishing = function(params, callback) {
  RoutingManager
    .findOutputRoutingByElementInstanceUuidsAndRoutingPublishing(_.pluck(params.elementInstance, 'uuid'))
    .then(AppUtils.onFind.bind(null, params, 'outputRouting', 'outputRouting not found.', callback));
}

const extractDifferentRoutingList = function(params, callback) {
  let intraRoutingList = [];
  let extraRoutingList = [];
  let otherRoutingList = [];

  params.elementInstance.forEach((instance) => {
    params.routing.forEach((route) => {
      if (route.publishing_instance_id != instance.iofabric_uuid || route.is_network_connection === 1) {
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
      if (route.destination_element_id != instance.iofabric_uuid || route.is_network_connection === 1) {
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

const deleteElementInstanceRouting = function(params, callback) {
  RoutingManager
    .deleteByPublishingElementId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Routing found', callback));
}

const deleteNetworkElementRouting = function(params, callback) {
  RoutingManager
    .deleteByNetworkElementInstanceId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Element Instance Routing found', callback));
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

export default {
  createRoute: createRoute,
  findByElementInstanceUuids: findByElementInstanceUuids,
  extractDifferentRoutingList: extractDifferentRoutingList,
  findOutputRoutingByElementInstanceUuids: findOutputRoutingByElementInstanceUuids,
  extractDifferentOutputRoutingList: extractDifferentOutputRoutingList,
  deleteElementInstanceRouting: deleteElementInstanceRouting,
  deleteNetworkElementRouting: deleteNetworkElementRouting,
  deleteByFogAndElement: deleteByFogAndElement,
  findByElementInstanceUuidsAndRoutingDestination: findByElementInstanceUuidsAndRoutingDestination,
  findOutputRoutingByElementInstanceUuidsAndRoutingPublishing: findOutputRoutingByElementInstanceUuidsAndRoutingPublishing
};
