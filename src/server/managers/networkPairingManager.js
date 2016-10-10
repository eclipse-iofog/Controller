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

}

const instance = new NetworkPairingManager();
export default instance;