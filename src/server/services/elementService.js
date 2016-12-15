import ElementManager from '../managers/elementManager';
import AppUtils from '../utils/appUtils';

const getNetworkElement = function(props, params, callback) {
  var networkElementId = AppUtils.getProperty(params, props.networkElementId);

  ElementManager
    .findElementById(networkElementId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to find Element object with id ' + networkElementId, callback));

}

const getElementById = function(props, params, callback) {
  var elementId = AppUtils.getProperty(params, props.elementId);

  ElementManager
    .findElementById(elementId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Element object with id' + elementId, callback));
}



export default {
  getNetworkElement: getNetworkElement,
  getElementById: getElementById
};