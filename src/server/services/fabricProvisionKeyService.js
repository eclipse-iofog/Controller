import FabricProvisionKeyManager from '../managers/fabricProvisionKeyManager';
import AppUtils from '../utils/appUtils';


const deleteProvisonKeyByInstanceId = function(props, params, callback) {
  var instanceId = AppUtils.getProperty(params, props.instanceId);

  FabricProvisionKeyManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Provision Key', callback));
}

export default {
  deleteProvisonKeyByInstanceId: deleteProvisonKeyByInstanceId
}