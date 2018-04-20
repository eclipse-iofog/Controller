/**
 * @file satellitePortManager.js
 * @author Zishan Iqbal
 * @description
 */

import SatellitePort from './../models/satellitePort';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';
import Sequelize from 'sequelize';

class SatellitePortManager extends BaseManager {

  getEntity() {
    return SatellitePort;
  }

  getMaxPort() {
    return SatellitePort.max('port2');
  }

  findAllBySatelliteId(satelliteId) {
    return SatellitePort.findAll({
      where: {
        satellite_id: satelliteId
      }
    })
  }

  deleteByPortId(satellitePortId){
    return SatellitePort.destroy({
      where: {
        id: satellitePortId
      }
    })
  }

  findBySatellitePortIds(networkPairingIds) {
    return SatellitePort.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: networkPairingIds
        }
      }
    })
  }

  getPortPasscodeForNetworkElements(elementId) {
    let query = ' \
      SELECT sp.passcode_port1, sp.mapping_id, s.domain \
      FROM satellite_port sp, satellite s \
      WHERE sp.id IN ( \
        SELECT satellitePortId \
        FROM network_pairing \
        WHERE elementID1 = "' + elementId + '" \
        OR elementID2 = "' + elementId + '" \
      ) \
      AND sp.satellite_id = s.id';

    return sequelize.query(query);
  }

  deletePortsForNetworkElements(elementId) {
    let deleteQuery = ' \
      DELETE FROM satellite_port \
      WHERE id IN ( \
        SELECT satellitePortId \
        FROM network_pairing \
        WHERE elementID1 = "' + elementId + '" \
        OR elementID2 = "' + elementId + '" \
      )';

    return sequelize.query(deleteQuery);
  }

}

const instance = new SatellitePortManager();
export default instance;