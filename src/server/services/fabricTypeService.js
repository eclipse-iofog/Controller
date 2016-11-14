import FabricTypeManager from '../managers/fabricTypeManager';
import AppUtils from '../utils/appUtils';

const getFabricTypeDetail = function(props, params, callback) {
  var fogTypeId = AppUtils.getProperty(params, props.fogTypeId);

  FabricTypeManager
    .findById(fogTypeId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to read fabric type detail', callback));
}

export default {
  getFabricTypeDetail: getFabricTypeDetail

};