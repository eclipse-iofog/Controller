import ElementInstanceCleanUpManager from "../managers/elementInstanceCleanUpManager";
import AppUtils from "../utils/appUtils";

/**
 * @author elukashick
 */

const listByFogUUID = function (props, params, callback) {
    let ioFogUUID = AppUtils.getProperty(params, props.uuid);

    ElementInstanceCleanUpManager
        .listByFogUUID(ioFogUUID)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const deleteByElementInstanceId = function (statusObj, params, callback) {
    let elementInstanceUUID = statusObj.id;

    ElementInstanceCleanUpManager
        .deleteByElementInstanceUUID(elementInstanceUUID)
        .then(AppUtils.onDelete.bind(null, params, null, callback));
};

const deleteByFogUUID = function (props, params, param, callback) {
    let ioFogUUID = AppUtils.getProperty(params, props.uuid),
        cleanUpElements = params.cleanUpElements;

    let elementIds = [];
    if (cleanUpElements.length > 0) {
        for (let i = 0, len = cleanUpElements.length; i < len; i++) {
            elementIds.push(cleanUpElements[i].elementInstanceUUID);
        }

        ElementInstanceCleanUpManager
            .deleteByFogUUID(ioFogUUID)
            .then(AppUtils.onDelete.bind(null, elementIds, 'Unable to delete Clean Up Elements', callback));
    }
};

export default {
    listByFogUUID: listByFogUUID,
    deleteByElementInstanceId: deleteByElementInstanceId,
    deleteByFogUUID: deleteByFogUUID
};