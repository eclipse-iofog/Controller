/**
 * @file elementAdvertisedPortManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

import ElementAdvertisedPort from './../models/elementAdvertisedPort';
import BaseManager from './baseManager';

class ElementAdvertisedPortManager extends BaseManager {
  getEntity() {
    return ElementAdvertisedPort;
  }

  findElementAdvertisedPortByElementIds(elementIds) {
    return ElementAdvertisedPort.findAll({
      where: {
        element_id: {
          $in: elementIds
        }
      }
    });
  }
}

const instance = new ElementAdvertisedPortManager();
export default instance;