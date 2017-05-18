import FogTypeManager from '../managers/fogTypeManager';
import AppUtils from '../utils/appUtils';

const getFogTypeDetail = function(props, params, callback) {
  var fogTypeId = AppUtils.getProperty(params, props.fogTypeId);

  FogTypeManager
    .findFogTypeById(fogTypeId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find fogType details', callback));
}

const getFogTypeDetails = function(props, params, callback) {

  FogTypeManager
    .findFogTypeById(props.fogTypeId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find fogType details', callback));
}

const getFogTypesList = function(props, params, callback) {

  FogTypeManager
    .getFogTypes() 
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to get Fog Types List', callback));
}

export default {
  getFogTypeDetail: getFogTypeDetail,
  getFogTypeDetails: getFogTypeDetails,
  getFogTypesList: getFogTypesList
};