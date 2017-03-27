import SatellitePortManager from '../managers/satellitePortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createSatellitePort = function(props, params, callback) {
  SatellitePortManager
    .create(props.satellitePortObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create satellite port', callback));
}

const deletePortsForNetworkElements = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  SatellitePortManager
    .deletePortsForNetworkElements(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

const deleteSatellitePort = function(props, params, callback) {
  var satellitePortId = AppUtils.getProperty(params, props.satellitePortId);
  
  SatellitePortManager
    .deleteById(satellitePortId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

const deleteSatellitePortByIds = function(props, params, callback) {
  var satellitePortIds = AppUtils.getProperty(params, props.satellitePortIds);

  SatellitePortManager
    .deleteByPortId(_.pluck(satellitePortIds, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findBySatellitePortIds = function(props, params, callback) {
  var networkData = AppUtils.getProperty(params, props.networkData);

  SatellitePortManager
    .findBySatellitePortIds(_.pluck(networkData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getPasscodeForNetworkElements = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  SatellitePortManager
    .getPortPasscodeForNetworkElements(elementId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find satellite port pass code', callback));
}

const getSatellitePort = function(props, params, callback) {
  var satellitePortId = AppUtils.getProperty(params, props.satellitePortId);

  SatellitePortManager
    .findById(satellitePortId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Satellite Port for Network Pairing Instance', callback));
}

export default {
  createSatellitePort: createSatellitePort,
  deletePortsForNetworkElements: deletePortsForNetworkElements,
  deleteSatellitePort: deleteSatellitePort,
  deleteSatellitePortByIds: deleteSatellitePortByIds,
  findBySatellitePortIds: findBySatellitePortIds,
  getPasscodeForNetworkElements: getPasscodeForNetworkElements,
  getSatellitePort: getSatellitePort
};