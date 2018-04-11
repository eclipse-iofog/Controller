import AppUtils from "../utils/appUtils";
import ElementInstanceStatusManager from "../managers/elementInstanceStatusManager";

/**
 * @author elukashick
 */

const upsertStatus = function (statusObj, params, callback) {
    let obj = {
        status: statusObj.status,
        cpuUsage: statusObj.cpuusage,
        memoryUsage: statusObj.memoryusage,
        containerId: statusObj.containerId,
        uuid: statusObj.id
    };

    ElementInstanceStatusManager
        .upsertStatus(obj)
        .then(AppUtils.onUpdateOrCreate.bind(null, params, '', 'Unable to create or update Element Instance Status', callback));
};

export default {
    upsertStatus: upsertStatus
};