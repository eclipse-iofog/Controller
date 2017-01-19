import SatelliteManager from '../managers/satelliteManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const findBySatelliteIds = function(props, params, callback) {
  var satellitePortData = AppUtils.getProperty(params, props.satellitePortData);

  SatelliteManager
    .findBySatelliteIds(_.pluck(satellitePortData, props.field))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Satellite not found.', callback));
}

const getRandomSatellite = function(params, callback) {
  var randomNumber;

  SatelliteManager.findAll()
    .then((satellites) => {
      if (satellites && satellites.length > 0) {
        randomNumber = Math.round((Math.random() * (satellites.length - 1)));
        console.log('Random number ' + randomNumber);
        params.satellite = satellites[randomNumber];
        callback(null, params);
      } else {
        callback('error', 'No Satellite defined');
      }
    });
}

const getSatelliteById = function(props, params, callback) {
  var satelliteId = AppUtils.getProperty(params, props.satelliteId);

  SatelliteManager
    .findById(satelliteId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Satellite', callback));
}

export default {
  findBySatelliteIds: findBySatelliteIds,
  getRandomSatellite: getRandomSatellite,
  getSatelliteById: getSatelliteById
};