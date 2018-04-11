import DataTracksManager from '../managers/dataTracksManager';
import AppUtils from '../utils/appUtils';

const createDataTrack = function(props, params, callback) {
  DataTracksManager
    .create(props.dataTrackObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create DataTrack object.', callback));
}

const deleteTrackById = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .deleteByTrackId(trackId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Track having Id' + trackId, callback));
}

const findContainerListByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findContainerListByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find data tracks', callback));
}

const findContainerListWithStatusByInstanceId = function (props, params, param, callback) {
    let instanceId = AppUtils.getProperty(params, props.instanceId);

    DataTracksManager
        .findContainerListWithStatusByInstanceId(instanceId)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find docker container list', callback));
}

const getDataTrackById = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);
  let errorMsg = '';
  if(props.errorMsg){
    errorMsg = props.errorMsg;
  }

  DataTracksManager
    .findById(trackId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, errorMsg + 'Unable to find Track having id ' + trackId, callback));
}

const getTrackById = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .findById(trackId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}


const getDataTrackByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  DataTracksManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Data Track', callback));
}

const getTracksByUserId = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  DataTracksManager
    .getTracksByUserId(userId)
    .then(AppUtils.onFind.bind(null, params,props.setProperty, 'Unable to find Data Track', callback));
}

const updateDataTrackById = function(props, params, callback) {
  let trackId = AppUtils.getProperty(params, props.trackId);

  DataTracksManager
    .updateById(trackId, props.updatedObj)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update DataTrack', callback));
}

const updateDataTrackByUserId = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  DataTracksManager
    .updateByUserId(userId, props.updatedObj)
    .then(AppUtils.onUpdateOptional.bind(null, params, callback));
}

export default {
  createDataTrack: createDataTrack,
  deleteTrackById: deleteTrackById,
  findContainerListByInstanceId: findContainerListByInstanceId,
  getDataTrackById: getDataTrackById,
  getTrackById: getTrackById,
  getDataTrackByInstanceId: getDataTrackByInstanceId,
  getTracksByUserId: getTracksByUserId,
  updateDataTrackById: updateDataTrackById,
    updateDataTrackByUserId: updateDataTrackByUserId,
    findContainerListWithStatusByInstanceId: findContainerListWithStatusByInstanceId
};