import ElementAdvertisedPortManager from '../managers/elementAdvertisedPortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const findElementAdvertisedPortByElementIds = function(props, params, callback) {
  var elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementAdvertisedPortManager
    .findElementAdvertisedPortByElementIds(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Element Advertised Port Not found', callback));
}

export default {
  findElementAdvertisedPortByElementIds: findElementAdvertisedPortByElementIds,
};