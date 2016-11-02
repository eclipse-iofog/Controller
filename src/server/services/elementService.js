import ElementManager from '../managers/elementManager';
import AppUtils from '../utils/appUtils';

const getNetworkElement = function(params, callback) {
  ElementManager
    .findElementById(params.fabricType.networkElementKey)
    .then(AppUtils.onCreate.bind(null, params, 'networkElement', 'Unable to find Element object with id ' + params.fabricType.networkElementKey, callback));

}

const getElement = function(params, callback) {
  ElementManager
    .findElementById(params.bodyParams.ElementKey)
    .then(AppUtils.onCreate.bind(null, params, 'element', 'Unable to find Element object with id ' + params.bodyParams.ElementKey, callback));

}

export default {
  getNetworkElement: getNetworkElement,
  getElement: getElement
};