import RegistryManager from '../managers/registryManager';
import AppUtils from '../utils/appUtils';


const findRegistriesByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  RegistryManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find registries with instanceId: '+instanceId, callback));
};

const listRegistry = function (props, params, callback) {

};

const addRegistry = function (props, params, callback) {

};

const deleteRegistry = function (props, params, callback) {

};

export default {
    findRegistriesByInstanceId: findRegistriesByInstanceId,
    listRegistry: listRegistry,
    addRegistry: addRegistry,
    deleteRegistry: deleteRegistry
};