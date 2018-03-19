
const architecturesImagesFieldsNames = Object.freeze({
    1: 'x86ContainerImage',
    2: 'armContainerImage'
});

const isExistsImageForFogType = function (fogTypeId, elementImages) {
    let currentFieldName = architecturesImagesFieldsNames[fogTypeId];
    return currentFieldName && elementImages[currentFieldName] !== '';
};

const createImagesListJsonTemplate = function () {
    let imagesList = {};

    Object.keys(architecturesImagesFieldsNames).forEach(function (currentArcType) {
        imagesList[architecturesImagesFieldsNames[currentArcType]] = ''
    });

    return imagesList;

};

const fillImageField = function (arcTypeId, imageValue, imagesList) {
    imagesList[architecturesImagesFieldsNames[arcTypeId]] = imageValue;
};

export default {
    architecturesList: architecturesImagesFieldsNames,
    isExistsImageForFogType: isExistsImageForFogType,
    createImagesListJsonTemplate: createImagesListJsonTemplate,
    fillImageField: fillImageField
}