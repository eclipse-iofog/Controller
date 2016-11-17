/**
 * @file networkPairingManager.js
 * @author Zishan Iqbal
 * @description
 */

import NetworkPairing from './../models/networkPairing';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class NetworkPairingManager extends BaseManager {

  getEntity() {
    return NetworkPairing;
  }

  findByElemen1PortIds(portIds) {
    return NetworkPairing.findAll({
      where: {
        'elemen1PortId': {
          $in: portIds
        }
      }
    });
  }

  findNetworkPairingElemenId1ByUuids(uuids) {
    const query = 'select distinct(elementId1) from network_pairing where networkElementId2 in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

  findNetworkPairingElemenId2ByUuids(uuids) {
    const query = 'select distinct(elementId2) from network_pairing where networkElementId1 in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
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