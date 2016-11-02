import RoutingManager from '../managers/routingManager';
import AppUtils from '../utils/appUtils';

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
  deleteElementInstanceRouting: deleteElementInstanceRouting,
  deleteNetworkElementRouting: deleteNetworkElementRouting

};