import GeneratedIdsManager from '../managers/generatedIdsManager';
import AppUtils from '../utils/appUtils';

const findGeneratedIdsByBBID = function(props, params, callback) {
  var bbid = AppUtils.getProperty(params, props.bbid);

  GeneratedIdsManager
    .getGeneratedIdsByBBIDAndActivated(bbid)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Registration failed: Please enter a valid token.', callback));
}

const updateGeneratedIdsByBBID = function(props, params, callback) {
  var bbid = AppUtils.getProperty(params, props.bbid);

  GeneratedIdsManager
    .updateGeneratedIdsByBBID(bbid, props.updatedObj)
    .then(AppUtils.onUpdate.bind(null, params, 'Updation failed: Please enter a valid token.', callback));
}

export default {
  findGeneratedIdsByBBID: findGeneratedIdsByBBID,
  updateGeneratedIdsByBBID: updateGeneratedIdsByBBID
}