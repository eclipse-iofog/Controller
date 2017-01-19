import ElementFabricTypeManager from '../managers/elementFabricTypeManager';
import AppUtils from '../utils/appUtils';

const createElementFogType = function(props, params) {
  ElementFabricTypeManager
    .createElementFogType(props.elementType)
}

const deleteElementFogType = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementFabricTypeManager
    .deleteElementFogTypes(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'ElementFogType not deleted', callback));
}

export default {
  createElementFogType: createElementFogType,
  deleteElementFogType: deleteElementFogType
};
