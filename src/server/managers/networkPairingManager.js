/**
 * @file networkPairingManager.js
 * @author Zishan Iqbal
 * @description
 */

import NetworkPairing from './../models/networkPairing';
import BaseManager from './../managers/baseManager';

class NetworkPairingManager extends BaseManager {

  getEntity() {
    return NetworkPairing;
  }

  create(instanceId1, instanceId2, elementId1, elementId2, networkElementId1, networkElementId2, isPublicPort, element1PortId, satellitePortId) {
    var networkPairingObj = {
      instanceId1: instanceId1,
      instanceId2: instanceId2,
      isPublicPort: isPublicPort,
      elementId1: elementId1,
      elementId2: elementId2,
      networkElementId1: networkElementId1,
      networkElementId2: networkElementId2,
      element1PortId: element1PortId,
      satellitePortId: satellitePortId
    };

    return NetworkPairing.create(networkPairingObj);
  }

}

const instance = new NetworkPairingManager();
export default instance;