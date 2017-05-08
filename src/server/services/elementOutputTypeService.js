import ElementOutputTypeManager from '../managers/elementOutputTypeManager';
import AppUtils from '../utils/appUtils';

const createElementOutputType = function(props, params, callback) {
  
  ElementOutputTypeManager
    .createElementOutputType(props.elementOutputType)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Output Type object.', callback));
}

const updateElementOutputType = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementOutputTypeManager
    .updateElementOutputType(elementKey, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Output Type object.', callback));
}

const deleteElementOutputType = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementOutputTypeManager
    .deleteByElementKey(elementKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createElementOutputType: createElementOutputType,
  updateElementOutputType: updateElementOutputType,
  deleteElementOutputType: deleteElementOutputType
}