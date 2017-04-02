/**
 * @file satelliteManager.js
 * @author Zishan Iqbal
 * @description
 */

import Satellite from './../models/satellite';
import BaseManager from './../managers/baseManager';
import AppUtils from './../utils/appUtils';
import Sequelize from 'sequelize';

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

  findBySatelliteNameDomainAndPublicIP(satelliteName, satelliteDomain, satellitePublicIP) {
    return Satellite.find({
      where: {
        $or: [{
            name: 
              { 
                $like: satelliteName
              }
            }, {
            domain: satelliteDomain
            }, {
            publicIP: satellitePublicIP
        }]
      }
    });
  }

  createSatellite(name, domain, publicIP) {
    if (name && domain && publicIP) {
      if (AppUtils.isValidName(name)){
        if(AppUtils.isValidDomain(domain)){
          if(AppUtils.isValidPublicIP(publicIP)){
              this.findBySatelliteNameDomainAndPublicIP(name, domain, publicIP)
                .then(function(satellite) {
                  if (!satellite) {  
                    this.create({
                      name: name,
                      domain: domain,
                      publicIP: publicIP,
                    }).then(function(satellite) {
                    console.log('\nComSat Created : '+satellite.name);
                    });
                  }else {
                    console.log('\nError: Following ComSat already exists with similar configurations: \n ' + satellite.name + ' (' + satellite.domain + ') ' + satellite.publicIP);
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
      console.log('\nPlease provide values in following order:\n fog-controller comsat -add <name> <domain> <publicIP>');
    }
}

  removeSatellite(id) {
    if (id) {
      this.findBySatelliteId(id)
        .then(function(satellite) {
          if (satellite) {
            satellite.destroy();
            console.log('\nSuccess: ComSat deleted');
          } else {
            console.log('\nError: Can not find ComSat having "' + id + '" as ID');
          }
        })
    } else {
      console.log('\nPlease provide values in following order: fog-controller comsat -remove <id>');
    }
  }

  list() {
    this.find()
      .then(function(satellite) {
        if (satellite && satellite.length > 0) {
          console.log('\n\tID | ComSat Name | Domain | Public IP');
          for (var i = 0; i < satellite.length; i++) {
            console.log('\t' + satellite[i].id + ' | ' + satellite[i].name + ' | ' + satellite[i].domain + ' | ' 
                        + satellite[i].publicIP);
          }
        } else {
          console.log('No ComSat found');
        }
      });
  }
}

const instance = new SatelliteManager();
export default instance;