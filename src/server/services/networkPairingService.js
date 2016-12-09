import NetworkPairingManager from '../managers/networkPairingManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const getNetworkPairing = function(params, callback) {
  NetworkPairingManager
    .findById(params.bodyParams.networkPairingId)
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'Cannot find Network Pairing Instance', callback));
}

const findByElementInstancePortId = function(params, callback) {
  NetworkPairingManager
    .findByElemen1PortIds(_.pluck(params.elementInstancePort, 'id'))
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'NetworkPairing not found.', callback));
}

const findByElementInstancePortIds = function(params, callback) {
  NetworkPairingManager
    .findByElemen1PortIds(_.pluck(params.elementInstance, 'id'))
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'NetworkPairing not found.', callback));
}

const findOtherTrackByUuids = function(params, callback) {
  NetworkPairingManager
    .findNetworkPairingElemenId1ByUuids(_.uniq(_.pluck(_.where(params.otherRoutingList, {
      is_network_connection: 1
    }), 'publishing_element_id')))
    .then(AppUtils.onFind.bind(null, params, 'networkElementId', 'networkElementId not found.', callback));
}

const findOutputOtherElementInfoByUuids = function(params, callback) {
  NetworkPairingManager
    .findNetworkPairingElemenId2ByUuids(_.uniq(_.pluck(_.where(params.outputOtherRoutingList, {
      is_network_connection: 1
    }), 'destination_element_id')))
    .then(AppUtils.onFind.bind(null, params, 'networkElementId2', 'networkElementId2 not found.', callback));
}

const concatNetwotkElementAndNormalElement = function(params, callback) {
  params.otherTrackElementIds = params.networkElementId.concat(_.uniq(_.pluck(_.filter(params.otherRoutingList,
    function(item) {
      return item.is_network_connection !== 1;
    }), 'publishing_element_id')));
  callback(null, params);
}

const concatNetwotkElement2AndNormalElement = function(params, callback) {
  params.outputOtherTrackElementId2 = params.networkElementId2.concat(_.uniq(_.pluck(_.filter(params.outputOtherRoutingList,
    function(item) {
      return item.is_network_connection !== 1;
    }), 'destination_element_id')));
  callback(null, params);
}

const getNetworkPairingByFogAndElement = function(props, params, callback) {

  var instanceId1 = AppUtils.getProperty(params, props.instanceId1),
    instanceId2 = AppUtils.getProperty(params, props.instanceId2),
    elementId1 = AppUtils.getProperty(params, props.elementId1),
    elementId2 = AppUtils.getProperty(params, props.elementId2);

  NetworkPairingManager
    .findByFogAndElement(instanceId1, instanceId2, elementId1, elementId2)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Network pairing', callback));

}

const createNetworkPairing = function(props, params, callback) {

  var networkPairingObj = {
    instanceId1: AppUtils.getProperty(params, props.instanceId1),
    instanceId2: AppUtils.getProperty(params, props.instanceId2),
    elementId1: AppUtils.getProperty(params, props.elementId1),
    elementId2: AppUtils.getProperty(params, props.elementId2),
    networkElementId1: AppUtils.getProperty(params, props.networkElementId1),
    networkElementId2: AppUtils.getProperty(params, props.networkElementId2),
    isPublicPort: props.isPublic,
    element1PortId: AppUtils.getProperty(params, props.elementPortId),
    satellitePortId: AppUtils.getProperty(params, props.satellitePortId)
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Network pairing', callback));

}

const deleteNetworkPairing = function(params, callback) {
  NetworkPairingManager
    .deleteByElementId(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Pairing Element found', callback));
}

const deleteNetworkPairingById = function(props, params, callback) {
  var networkPairingId = AppUtils.getProperty(params, props.networkPairingId);

  NetworkPairingManager
    .deleteById(networkPairingId)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Pairing Element found', callback));
}

export default {
  getNetworkPairing: getNetworkPairing,
  getNetworkPairingByFogAndElement: getNetworkPairingByFogAndElement,
  findByElementInstancePortIds: findByElementInstancePortIds,
  findOtherTrackByUuids: findOtherTrackByUuids,
  concatNetwotkElementAndNormalElement: concatNetwotkElementAndNormalElement,
  findOutputOtherElementInfoByUuids: findOutputOtherElementInfoByUuids,
  concatNetwotkElement2AndNormalElement: concatNetwotkElement2AndNormalElement,
  createNetworkPairing: createNetworkPairing,
  deleteNetworkPairing: deleteNetworkPairing,
  deleteNetworkPairingById: deleteNetworkPairingById,
  findByElementInstancePortId: findByElementInstancePortId

};