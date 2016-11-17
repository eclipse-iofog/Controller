import ElementAdvertisedPortManager from '../managers/elementAdvertisedPortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const findElementAdvertisedPortByElementIds = function(params, callback) {
  ElementAdvertisedPortManager
    .findElementAdvertisedPortByElementIds(_.pluck(params.elementInstance, 'element_key'))
    .then(AppUtils.onFind.bind(null, params, 'elementAdvertisedPort', 'Element Advertised Port Not found', callback));
}

export default {
  findElementAdvertisedPortByElementIds: findElementAdvertisedPortByElementIds,
};