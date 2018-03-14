import RegistryManager from '../managers/registryManager';
import AppUtils from '../utils/appUtils';


const findRegistriesByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  RegistryManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find registries with instanceId: '+instanceId, callback));
};

const listRegistry = function (props, params, callback) {
    let user_id = AppUtils.getProperty(params, props.userId);

    RegistryManager
        .findByUserId(user_id)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const addRegistry = function (props, params, callback) {
    let url = AppUtils.getProperty(params, props.url),
        isPublic = AppUtils.getProperty(params, props.isPublic),
        username = AppUtils.getProperty(params, props.username),
        password = AppUtils.getProperty(params, props.password),
        email = AppUtils.getProperty(params, props.email),
        userId = AppUtils.getProperty(params, props.userId);

    let registryObj = {
        url: url,
        username: username,
        password: password,
        email: email,
        userId: userId,
        isPublic: isPublic
    };

    RegistryManager
        .create(registryObj)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Registry.', callback));
};

const deleteRegistry = function (props, params, callback) {
    RegistryManager
        .deleteById(props.id)
        .then(AppUtils.onDelete.bind(null, params, 'No Registry found', callback));
};

export default {
    findRegistriesByInstanceId: findRegistriesByInstanceId,
    listRegistry: listRegistry,
    addRegistry: addRegistry,
    deleteRegistry: deleteRegistry
};