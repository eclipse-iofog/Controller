import ElementInputTypeManager from '../managers/elementInputTypeManager';
import AppUtils from '../utils/appUtils';

const createElementInputType = function(props, params, callback) {
  
  ElementInputTypeManager
    .createElementInputType(props.elementInputType)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Input Type object.', callback));
}

const updateElementInputType = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInputTypeManager
    .updateElementInputType(elementKey, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Input Type object.', callback));
}

const deleteElementInputType = function(props, params, callback) {
  var elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInputTypeManager
    .deleteByElementKey(elementKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createElementInputType: createElementInputType,
  updateElementInputType: updateElementInputType,
  deleteElementInputType: deleteElementInputType
}