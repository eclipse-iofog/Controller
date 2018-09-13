/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const ElementManager = require('../managers/elementManager');
const AppUtils = require('../utils/appUtils');
const ElementImageService = require('./elementImageService');

const createElement = function(props, params, callback) {
  ElementManager
    .create(props.element)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element object.', callback));
}

const deleteElementById = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementManager
    .deleteElementById(elementId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete Element', callback));
}

const getElementDetails = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  let imageProps = {
      elementId: 'ID',
      setProperty: 'elementImages'
  };

  ElementManager
    .getElementDetails(elementId)
    .then(ElementImageService.populateImagesForElement.bind(null, imageProps))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Element details', callback));
}

const findElementImageAndRegistryByIdForFogInstance = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);
  let fogId = AppUtils.getProperty(params, props.instanceId);

  ElementManager
    .findElementImageAndRegistryByIdForFogInstance(elementId, fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Element Image or Registry for Element with id ' + elementId + ' and Fog with id ' + fogId, callback));
}

const getElementCatalog = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  let imageProps = {
      elementId: 'ID',
      setProperty: 'elementImages'
  };

  ElementManager
    .getElementCatalog(userId)
    .then(ElementImageService.populateImagesForElements.bind(null, imageProps))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Element catalog not found', callback));
}

const getElementForPublish = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  let imageProps = {
      elementId: 'ID',
      setProperty: 'elementImages'
  };
  ElementManager
    .getElementForPublish(userId)
    .then(ElementImageService.populateImagesForElements.bind(null, imageProps))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Element catalog not found', callback));
}

const getNetworkElement = function(props, params, callback) {
  let networkElementId = AppUtils.getProperty(params, props.networkElementId);

  ElementManager
    .findElementById(networkElementId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Element object with id ' + networkElementId, callback));
}

const updateElement = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementManager
    .updateElementById(elementId, props.updatedElement)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element object', callback));
}

const getElementByNameForUser = function (props, params, callback) {
    let elementName = AppUtils.getProperty(params, props.elementName),
        userId = AppUtils.getProperty(params, props.userId);

    let elementNameForUser = {
        elementName: elementName,
        userId: userId
    };

    let errMsg = 'Unable to find Element object with name ' + elementName;
    ElementManager
        .getElementByNameForUser(elementNameForUser)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, errMsg, callback))
};

module.exports =  {
  createElement: createElement,
  deleteElementById: deleteElementById,
  findElementImageAndRegistryByIdForFogInstance: findElementImageAndRegistryByIdForFogInstance,
  getElementCatalog: getElementCatalog,
  getElementDetails: getElementDetails,
  getElementForPublish: getElementForPublish,
  getNetworkElement: getNetworkElement,
  updateElement: updateElement,
  getElementByNameForUser: getElementByNameForUser
};