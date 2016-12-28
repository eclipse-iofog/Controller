import RegistryManager from '../managers/registryManager';
import AppUtils from '../utils/appUtils';


const findRegistriesByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  RegistryManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find registries with instanceId: '+instanceId, callback));
}

export default {
	findRegistriesByInstanceId: findRegistriesByInstanceId
};