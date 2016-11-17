import SatellitePortManager from '../managers/satellitePortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const getSatellitePort = function(params, callback) {
  SatellitePortManager
    .findById(params.networkPairing.satellitePortId)
    .then(AppUtils.onFind.bind(null, params, 'satellitePort', 'Cannot find Satellite Port for Network Pairing Instance', callback));
}

const getPasscodeForNetworkElements = function(params, callback) {
  SatellitePortManager
    .getPortPasscodeForNetworkElements(params.bodyParams.elementId)
    .then(AppUtils.onFind.bind(null, params, 'portPasscode', 'Cannot find satellite port pass code', callback));
}

const findBySatellitePortIds = function(params, callback) {
  SatellitePortManager
    .findBySatellitePortIds(_.pluck(params.networkPairing, 'satellitePortId'))
    .then(AppUtils.onFind.bind(null, params, 'satellitePort', 'SatellitePort not found.', callback));
}

const deletePortsForNetworkElements = function(params, callback) {
  SatellitePortManager
    .deletePortsForNetworkElements(params.bodyParams.elementId)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

const createSatellitePort = function(params, callback) {
  var satellitePortObj = {
    port1: params.comsatPort.port1,
    port2: params.comsatPort.port2,
    maxConnectionsPort1: 60,
    maxConnectionsPort2: 0,
    passcodePort1: params.comsatPort.passcode1,
    passcodePort2: params.comsatPort.passcode2,
    heartBeatAbsenceThresholdPort1: 60000,
    heartBeatAbsenceThresholdPort2: 0,
    satellite_id: params.satellite.id,
    mappingId: params.comsatPort.id
  };

  SatellitePortManager
    .create(satellitePortObj)
    .then(AppUtils.onCreate.bind(null, params, 'satellitePort', 'Unable to create satellite port', callback));

}

const deleteSatellitePort = function(params, callback) {
  console.log(params);
  SatellitePortManager
    .deleteById(params.satellitePort.id)
    .then(AppUtils.onDelete.bind(null, params, 'No Satellite Port found', callback));
}

export default {
  getSatellitePort: getSatellitePort,
  findBySatellitePortIds: findBySatellitePortIds,
  getPasscodeForNetworkElements: getPasscodeForNetworkElements,
  deletePortsForNetworkElements: deletePortsForNetworkElements,
  createSatellitePort: createSatellitePort,
  deleteSatellitePort: deleteSatellitePort

};