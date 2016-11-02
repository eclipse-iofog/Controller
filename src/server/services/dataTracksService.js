import DataTracksManager from '../managers/dataTracksManager';
import AppUtils from '../utils/appUtils';

const getDataTrackById = function(params, callback) {
  DataTracksManager
    .findById(params.bodyParams.trackId)
    .then(AppUtils.onFind.bind(null, params, 'dataTrack', 'Unable to find Track having id ' + params.bodyParams.trackId, callback));
}

const deleteTrackById = function(params, callback) {
  DataTracksManager
    .deleteByTrackId(params.bodyParams.trackId)
    .then(AppUtils.onDelete.bind(null, params, 'Was unable to delete Track having Id' + params.bodyParams.trackId, callback));

}

export default {
  getDataTrackById: getDataTrackById,
  deleteTrackById: deleteTrackById

};