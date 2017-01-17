import ChangeTrackingManager from '../managers/changeTrackingManager';
import AppUtils from '../utils/appUtils'


const getChangeTrackingByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ChangeTrackingManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find ChangeTracking', callback));
}

const initiateFabricChangeTracking = function(params, callback) {
  ChangeTrackingManager
    .createChangeTracking(params.fabricInstance.uuid)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to initialize change tracking for Fabric Instance', callback));
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

const updateConfigTracking = function(params, callback) {
  if (params.isConfigChanged) {
    var updateChange = {
      containerConfig: new Date().getTime()
    };

    ChangeTrackingManager
      .updateByUuid(params.elementInstance.iofabric_uuid, updateChange)
      .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Change Tracking for Fog instance', callback));
  } else {
    callback(null, params);
  }
}

const deleteChangeTracking = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ChangeTrackingManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Change Tracking', callback));
}

export default {
  getChangeTrackingByInstanceId: getChangeTrackingByInstanceId,
  initiateFabricChangeTracking: initiateFabricChangeTracking,
  updateChangeTrackingData: updateChangeTrackingData,
  updateChangeTracking: updateChangeTracking,
  updateConfigTracking: updateConfigTracking,
  deleteChangeTracking: deleteChangeTracking
};