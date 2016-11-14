import ElementManager from '../managers/elementManager';
import AppUtils from '../utils/appUtils';

const getNetworkElement = function(props, params, callback) {
  var networkElementId = AppUtils.getProperty(params, props.networkElementId);

  ElementManager
    .findElementById(networkElementId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to find Element object with id ' + networkElementId, callback));

}

const getElement = function(paramName, propertyName, params, callback) {
  var elementId = AppUtils.getProperty(params, paramName);

  ElementManager
    .findElementById(elementId)
    .then(AppUtils.onCreate.bind(null, params, propertyName, 'Unable to find Element object with id ' + elementId, callback));

}

export default {
  getNetworkElement: getNetworkElement,
  getElement: getElement
};