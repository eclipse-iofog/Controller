import ConsoleManager from '../managers/consoleManager';
import AppUtils from '../utils/appUtils';

const createConsole = function(params, callback) {
  var baseUrl = 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
    token = JSON.parse(params.debugConsole.config).accesstoken,
    consoleObj = {
      version: 1,
      apiBaseUrl: baseUrl,
      accessToken: token,
      elementId: params.debugConsole.uuid,
      iofabric_uuid: params.fabricInstance.uuid
    };

  ConsoleManager
    .create(consoleObj)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Console object', callback));
}

const getConsoleByFogInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteConsoleByFogInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Console', callback));
}

export default {
  createConsole: createConsole,
  getConsoleByFogInstanceId: getConsoleByFogInstanceId,
  deleteConsoleByFogInstanceId: deleteConsoleByFogInstanceId
};