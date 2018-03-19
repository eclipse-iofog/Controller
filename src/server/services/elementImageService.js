import ElementImageManager from '../managers/elementImageManager';
import AppUtils from '../utils/appUtils';
import async from "async";
import ArchitectureUtils from '../utils/architectureUtils'

const createElementImage = function(props, params, callback) {
  ElementImageManager
    .createElementImage(props)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Error: ElementImage not created', callback));
};

const getElementImagesByElementId = function (props, params, callback) {
    let elementId = AppUtils.getProperty(params, props.elementId);
    let packImages = function (images) {

        let imagesList = ArchitectureUtils.createImagesListJsonTemplate();

        return new Promise(resolve => {
            async.each(images, function (image, next) {
                ArchitectureUtils.fillImageField(image.iofog_type_id, image.containerImage, imagesList);
                next();
            }, function () {
                resolve(imagesList)
            })
        })
    };

    ElementImageManager
        .getElementImagesByElementId(elementId)
        .then(packImages)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback))
};

const updateElementImages = function (props, params, callback) {
    ElementImageManager
        .updateOrCreateElementImageByIdAndFogType(props)
        .then(AppUtils.onUpdateOrCreate.bind(null, params, null, "not update images", callback))
};

const deleteElementImage = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementImageManager
    .deleteElementImage(elementId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
};

const populateImagesForElement = function (imageProps, element) {
    return new Promise(resolve => {
        async.waterfall([
            async.apply(getElementImagesByElementId, imageProps, element)
        ], function (err, result) {
            resolve(element)
        })
    })

};

const populateImagesForElements = function (imageProps, elements) {
    return new Promise(resolve => {
        async.each(elements, function (element, inner_callback) {
            getElementImagesByElementId(imageProps, element, inner_callback);
        }, function () {
            resolve(elements)
        })
    })
};

export default {
  createElementImage: createElementImage,
  updateElementImages: updateElementImages,
  deleteElementImage: deleteElementImage,
  getElementImagesByElementId: getElementImagesByElementId,
  populateImagesForElement: populateImagesForElement,
  populateImagesForElements: populateImagesForElements,
};
