import FabricTypeManager from '../managers/fabricTypeManager';
import AppUtils from '../utils/appUtils';

const getFogTypeDetail = function(props, params, callback) {
  var fogTypeId = AppUtils.getProperty(params, props.fogTypeId);

  FabricTypeManager
    .findById(fogTypeId)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to read fogType details', callback));
}

const getFogTypesList = function(props, params, callback) {

  FabricTypeManager
    .getFabricTypes() 
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to get Fog Types List', callback));
}

export default {
  getFogTypeDetail: getFogTypeDetail,
  getFogTypesList: getFogTypesList
};