import ChangeTrackingManager from '../managers/changeTrackingManager';
import AppUtils from '../utils/appUtils'

const createFogChangeTracking = function(props, params, callback) {
  var fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

  ChangeTrackingManager
    .createChangeTracking(fogInstanceId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create change tracking for Fog Instance', callback));
}

const deleteChangeTracking = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ChangeTrackingManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Change Tracking', callback));
}

const getChangeTrackingByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ChangeTrackingManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find ChangeTracking', callback));
}

const updateChangeTracking = function(props, params, callback) {
  var fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

  ChangeTrackingManager
    .updateByUuid(fogInstanceId, props.changeObject)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Change Tracking', callback));
}

const updateChangeTrackingData = function(props, params) {
  var fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

  ChangeTrackingManager
    .updateByUuid(fogInstanceId, props.changeObject)
  }

export default {
  deleteChangeTracking: deleteChangeTracking,
  getChangeTrackingByInstanceId: getChangeTrackingByInstanceId,
  createFogChangeTracking: createFogChangeTracking,
  updateChangeTrackingData: updateChangeTrackingData,
  updateChangeTracking: updateChangeTracking
};