import ElementFogTypeManager from '../managers/elementFogTypeManager';
import AppUtils from '../utils/appUtils';

const createElementFogType = function(props, params, callback) {
  ElementFogTypeManager
    .createElementFogType(props.elementType)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Error: ElementFogType not created', callback));
}

const createElementFogTypes = function(props, params) {
  ElementFogTypeManager
    .createElementFogType(props.elementType)
}

const deleteElementFogType = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementFogTypeManager
    .deleteElementFogTypes(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'ElementFogType not deleted', callback));
}

export default {
  createElementFogType: createElementFogType,
  createElementFogTypes: createElementFogTypes,
  deleteElementFogType: deleteElementFogType
};
