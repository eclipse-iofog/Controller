import DataTracksManager from '../managers/dataTracksManager';
import AppUtils from '../utils/appUtils';

const createDataTrack = function(props, params, callback) {
  DataTracksManager
    .create(props.dataTrackObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create DataTrack object.', callback));
}

const deleteTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .deleteByTrackId(trackId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Track having Id' + trackId, callback));
}

const findContainerListByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findContainerListByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find data tracks', callback));
}

const getDataTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .findById(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Track having id ' + trackId, callback));
}

const getTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .findById(trackId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}


const getDataTrackByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Data Track', callback));
}

const getTracksByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  DataTracksManager
    .getTracksByUserId(userId)
    .then(AppUtils.onFind.bind(null, params,props.setProperty, 'Unable to find Data Track', callback));
}

const updateDataTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

 DataTracksManager
    .updateById(trackId, props.updatedObj)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update DataTrack', callback));
}

export default {
  createDataTrack: createDataTrack,
  deleteTrackById: deleteTrackById,
  findContainerListByInstanceId: findContainerListByInstanceId,
  getDataTrackById: getDataTrackById,
  getTrackById: getTrackById,
  getDataTrackByInstanceId: getDataTrackByInstanceId,
  getTracksByUserId: getTracksByUserId,
  updateDataTrackById: updateDataTrackById
};