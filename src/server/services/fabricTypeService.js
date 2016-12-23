import FabricTypeManager from '../managers/fabricTypeManager';
import AppUtils from '../utils/appUtils';

const getFabricTypeDetail = function(props, params, callback) {
  var fogTypeId = AppUtils.getProperty(params, props.fogTypeId);

  FabricTypeManager
    .findById(fogTypeId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to read fabric type detail', callback));
}

const getFogTypesList = function(props, params, callback) {

  FabricTypeManager
    .getFabricTypes() 
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to get Fog Types List', callback));
}

export default {
  getFabricTypeDetail: getFabricTypeDetail,
  getFogTypesList: getFogTypesList
};