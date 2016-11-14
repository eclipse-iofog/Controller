import NetworkPairingManager from '../managers/networkPairingManager';
import AppUtils from '../utils/appUtils';

const getNetworkPairing = function(params, callback) {
  NetworkPairingManager
    .findById(params.bodyParams.networkPairingId)
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'Cannot find Network Pairing Instance', callback));
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

const deleteNetworkPairingById = function(params, callback) {
  NetworkPairingManager
    .deleteById(params.networkPairing.id)
    .then(AppUtils.onDelete.bind(null, params, 'No Network Pairing Element found', callback));
}

export default {
  getNetworkPairing: getNetworkPairing,
  createNetworkPairing: createNetworkPairing,
  deleteNetworkPairing: deleteNetworkPairing,
  deleteNetworkPairingById: deleteNetworkPairingById,

};