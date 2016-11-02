import SatellitePortManager from '../managers/satellitePortManager';
import AppUtils from '../utils/appUtils';

const getPasscodeForNetworkElements = function(params, callback) {
  SatellitePortManager
    .getPortPasscodeForNetworkElements(params.bodyParams.elementId)
    .then(AppUtils.onFind.bind(null, params, 'portPasscode', 'Cannot find satellite port pass code', callback));
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

export default {
  getPasscodeForNetworkElements: getPasscodeForNetworkElements,
  deletePortsForNetworkElements: deletePortsForNetworkElements,
  createSatellitePort: createSatellitePort
};