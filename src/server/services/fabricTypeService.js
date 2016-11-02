import FabricTypeManager from '../managers/fabricTypeManager';
import AppUtils from '../utils/appUtils';

const getFabricTypeDetail = function(params, callback) {
  FabricTypeManager
    .findById(params.fabricInstance.typeKey)
    .then(AppUtils.onCreate.bind(null, params, 'fabricType', 'Unable to read fabric type detail', callback));

}

export default {
  getFabricTypeDetail: getFabricTypeDetail

};