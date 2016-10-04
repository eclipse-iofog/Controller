/**
 * @file dataTracksManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the dataTracks Model.
 */

import BaseManager from './../managers/baseManager';
import DataTracks from './../models/dataTracks';

class DataTracksManager extends BaseManager {

  getEntity() {
    return DataTracks;
  }

  findByInstanceId(instanceId) {
    return DataTracks.findAll({
      where: {
        instanceId: instanceId
      },
      attributes: ['id', 'name', 'description']
    });
  }

  findById(trackId) {
    return DataTracks.findOne({
      where: {
        'id': trackId
      }
    });
  }

}

const instance = new DataTracksManager();
export default instance;