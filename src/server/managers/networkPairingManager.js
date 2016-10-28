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

  deleteByElementId(elementId) {
    return NetworkPairing.destroy({
      where: {
        $or: [{
          elementId1: {
            $eq: elementId
          }
        }, {
          elementId2: {
            $eq: elementId
          }
        }]
      }
    });
  }

}

const instance = new NetworkPairingManager();
export default instance;