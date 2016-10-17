/**
 * @file satellitePortManager.js
 * @author Zishan Iqbal
 * @description
 */

import SatellitePort from './../models/satellitePort';
import BaseManager from './../managers/baseManager';
import AppUtils from './../utils/appUtils';

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
}

const instance = new SatellitePortManager();
export default instance;