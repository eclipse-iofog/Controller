import NetworkPairingManager from '../managers/networkPairingManager';
import AppUtils from '../utils/appUtils';

const getNetworkPairing = function(params, callback) {
  NetworkPairingManager
    .findById(params.bodyParams.networkPairingId)
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'Cannot find Network Pairing Instance', callback));
}

const createNeworkPairing = function(params, callback) {
  var networkPairingObj = {
    instanceId1: params.fabricInstance.uuid,
    instanceId2: null,
    elementId1: params.streamViewer.uuid,
    elementId2: null,
    networkElementId1: params.networkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: params.elementInstancePort.id,
    satellitePortId: params.satellitePort.id
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(AppUtils.onCreate.bind(null, params, 'networkPairingObj', 'Unable to create Network pairing', callback));

}

const createDebugNeworkPairing = function(params, callback) {
  var networkPairingObj = {
    instanceId1: params.fabricInstance.uuid,
    instanceId2: null,
    elementId1: params.debugConsole.uuid,
    elementId2: null,
    networkElementId1: params.networkElementInstance.uuid,
    networkElementId2: null,
    isPublicPort: true,
    element1PortId: params.satellitePort.id,
    satellitePortId: params.satellitePort.id
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Network pairing for Debug Console', callback));

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
  createNeworkPairing: createNeworkPairing,
  createDebugNeworkPairing: createDebugNeworkPairing,
  deleteNetworkPairing: deleteNetworkPairing,
  deleteNetworkPairingById: deleteNetworkPairingById,

};