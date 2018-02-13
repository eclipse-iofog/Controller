import ConsoleManager from '../managers/consoleManager';
import AppUtils from '../utils/appUtils';

const createConsole = function(props, params, callback) {
  ConsoleManager
    .create(props.consoleObj)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Console object', callback));
}

const getConsoleByFogInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteConsoleByFogInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createConsole: createConsole,
  getConsoleByFogInstanceId: getConsoleByFogInstanceId,
  deleteConsoleByFogInstanceId: deleteConsoleByFogInstanceId
};