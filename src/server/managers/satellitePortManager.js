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

  create(port1, port2, satelliteId) {
    return SatellitePort.create({
      port1: port1,
      port2: port2,
      maxConnectionsPort1: 60,
      maxConnectionsPort2: 0,
      passcodePort1: AppUtils.generateRandomString(32),
      passcodePort2: '',
      heartBeatAbsenceThresholdPort1: 60000,
      heartBeatAbsenceThresholdPort2: 0,
      satellite_id: satelliteId
    });
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