/**
 * @file satelliteManager.js
 * @author Zishan Iqbal
 * @description
 */

import Satellite from './../models/satellite';
import BaseManager from './../managers/baseManager';

class SatelliteManager extends BaseManager {

  getEntity() {
    return Satellite;
  }

  findAll() {
    return this.getEntity().findAll();
  }
}

const instance = new SatelliteManager();
export default instance;