import ElementImageManager from '../managers/elementImageManager';
import AppUtils from '../utils/appUtils';

const createElementImage = function(props, params, callback) {
  ElementImageManager
    .createElementImage(props)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Error: ElementImage not created', callback));
}

const updateElementImages = function (props, params, callback) {
    ElementImageManager
        .updateElementImageByIdAndFogType(props)
        .then(AppUtils.onUpdate.bind(null, params, "not update images", callback))
}

const deleteElementImage = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementImageManager
    .deleteElementImage(elementId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createElementImage: createElementImage,
  updateElementImages: updateElementImages,
  deleteElementImage: deleteElementImage
};
