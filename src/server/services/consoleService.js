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

const getConsoleByFogInstanceId = function(params, callback) {
  ConsoleManager
    .findByInstanceId(params.bodyParams.instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, 'console', callback));
}

export default {
  createConsole: createConsole,
  getConsoleByFogInstanceId: getConsoleByFogInstanceId
};