import async from "async";

const architecturesList = Object.freeze({
    x86: {id: 1, imagesFieldName: 'x86ContainerImage'},
    arm: {id: 2, imagesFieldName: 'armContainerImage'}
});

const isExistsImageForFogType = function (fogTypeId, elementImages) {
    let res = false;
    async.each(Object.keys(architecturesList), function (currentArcType, next) {
        console.log(architecturesList[currentArcType])
        if (architecturesList[currentArcType].id == fogTypeId
            && elementImages[architecturesList[currentArcType].imagesFieldName] !== '') {
            res = true;
        } else {
            next()
        }
    }, function () {
        return res;
    });
    return res
};

const createImagesListJsonTemplate = function () {
    let imagesList = {};

    Object.keys(architecturesList).forEach(function (currentArcType) {
        imagesList[architecturesList[currentArcType].imagesFieldName] = ''
    });

    return imagesList;

};

const fillImageField = function (arcTypeId, imageValue, imagesList) {
    switch (arcTypeId) {
        case architecturesList.x86.id: imagesList[architecturesList.x86.imagesFieldName] = imageValue; break;
        case architecturesList.arm.id: imagesList[architecturesList.arm.imagesFieldName] = imageValue; break;
    }
};

export default {
    architecturesList: architecturesList,
    isExistsImageForFogType: isExistsImageForFogType,
    createImagesListJsonTemplate: createImagesListJsonTemplate,
    fillImageField: fillImageField
}