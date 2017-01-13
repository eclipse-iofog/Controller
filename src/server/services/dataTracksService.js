import DataTracksManager from '../managers/dataTracksManager';
import AppUtils from '../utils/appUtils';

const findContainerListByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findContainerListByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find data tracks', callback));
}
const getDataTrackByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Data Track', callback));
}

const getDataTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .findById(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Track having id ' + trackId, callback));
}

const deleteTrackById = function(params, callback) {
  DataTracksManager
    .deleteByTrackId(params.bodyParams.trackId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Track having Id' + params.bodyParams.trackId, callback));
}
const updateDataTrackById = function(props, params, callback) {
  var trackId = AppUtils.getProperty(params, props.trackId);

 DataTracksManager
    .updateById(trackId, props.updatedObj)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update DataTrack', callback));
}

export default {
  findContainerListByInstanceId: findContainerListByInstanceId,
  updateDataTrackById: updateDataTrackById,
  getDataTrackByInstanceId: getDataTrackByInstanceId,
  getDataTrackById: getDataTrackById,
  deleteTrackById: deleteTrackById
};