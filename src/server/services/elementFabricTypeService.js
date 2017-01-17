import ElementFabricTypeManager from '../managers/elementFabricTypeManager';
import AppUtils from '../utils/appUtils';

const createElementFabricType = function(props, params) {
  ElementFabricTypeManager
    .createElementFabricType(props.elementType)
}

const deleteElementFogType = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementFabricTypeManager
    .deleteElementFabricTypes(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'ElementFogType not deleted', callback));
}

export default {
  createElementFabricType: createElementFabricType,
  deleteElementFogType: deleteElementFogType
};
