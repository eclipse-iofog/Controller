/**
 * @file satelliteManager.js
 * @author Zishan Iqbal
 * @description
 */

import Satellite from './../models/satellite';
import BaseManager from './../managers/baseManager';
import AppUtils from './../utils/appUtils';


class SatelliteManager extends BaseManager {

  getEntity() {
    return Satellite;
  }

  findAll() {
    return this.getEntity().findAll();
  }

  findBySatelliteId(satelliteId) {
    return Satellite.find({
      where: {
        id:  satelliteId
      }
    })
  }

  findBySatelliteIds(satelliteIds) {
    return Satellite.findAll({
      where: {
        id: {
          $in: satelliteIds
        }
      }
    })
  }

  findBySatelliteName(satelliteName) {
    return Satellite.find({
      where: {
        name: satelliteName
      }
    })
  }

  createSatellite(name, domain, publicIP) {
    if (name && domain && publicIP) {
      if (AppUtils.isValidName(name)){
        if(AppUtils.isValidDomain(domain)){
          if(AppUtils.isValidPublicIP(publicIP)){
            this.findBySatelliteName(name)
              .then(function(satellite) {
                if (!satellite) {  
                  this.create({
                    name: name,
                    domain: domain,
                    publicIP: publicIP,
                  }).then(function(satellite) {
                    console.log('\nSatellite Created : '+satellite.name);
                  });
                }else {
                  console.log('\nSatellite already exists with this name. Please try again with different Name.');
                }
              });
            }else{
              console.log('ComSat publicIP is invalid. Try again with different ComSat publicIP.');
            }
        }
      }else{
        console.log('ComSat name is invalid. Try again with different ComSat name.');
      }
    }else { 
      console.log('\nPlease provide values in following order:\n fog-controller satellite -add <name> <domain> <publicIP>');
    }
}

  removeSatellite(id) {
    if (id) {
      this.findBySatelliteId(id)
        .then(function(satellite) {
          if (satellite) {
            satellite.destroy();
            console.log('\nSuccess: Satellite deleted');
          } else {
            console.log('\nError: Can not find Satellite having "' + id + '" as ID');
          }
        })
    } else {
      console.log('\nPlease provide values in following order: fog-controller satellite -remove <id>');
    }
  }

  list() {
    this.find()
      .then(function(satellite) {
        if (satellite && satellite.length > 0) {
          console.log('\n\tID | Satellite Name | Domain | Public IP');
          for (var i = 0; i < satellite.length; i++) {
            console.log('\t' + satellite[i].id + ' | ' + satellite[i].name + ' | ' + satellite[i].domain + ' | ' 
                        + satellite[i].publicIP);
          }
        } else {
          console.log('No satellite found');
        }
      });
  }
}

const instance = new SatelliteManager();
export default instance;