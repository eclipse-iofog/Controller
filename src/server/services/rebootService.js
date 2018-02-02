import RebootManager from '../managers/rebootManager';
import AppUtils from '../utils/appUtils';


const findRebootByInstanceId = function(props, params, callback) {
    var instanceId = AppUtils.getProperty(params, props.instanceId);

    RebootManager
        .findByInstanceId(instanceId)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find reboot with instanceId: '+instanceId, callback));
}

export default {
    findRebootByInstanceId: findRebootByInstanceId
};