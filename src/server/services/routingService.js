import RoutingManager from '../managers/routingManager';
import AppUtils from '../utils/appUtils';

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

export default {
  createRoute: createRoute,
  deleteElementInstanceRouting: deleteElementInstanceRouting,
  deleteNetworkElementRouting: deleteNetworkElementRouting

};