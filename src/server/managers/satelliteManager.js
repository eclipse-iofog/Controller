/**
 * @file satelliteManager.js
 * @author Zishan Iqbal
 * @description
 */

import Satellite from './../models/satellite';
import BaseManager from './../managers/baseManager';
import AppUtils from './../utils/appUtils';
import Sequelize from 'sequelize';
import fs from 'fs';

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

  createSatellite(name, domain, publicIP, certFile) {
    if (name && domain && publicIP) {
      if (AppUtils.isValidName(name)){
        if(AppUtils.isValidDomain(domain)){
          if(AppUtils.isValidPublicIP(publicIP)){
              this.findBySatelliteNameDomainAndPublicIP(name, domain, publicIP)
                .then((satellite) => {
                  if (!satellite) {
                    if (!certFile) {
                      this.create({
                        name: name,
                        domain: domain,
                        publicIP: publicIP,
                        cert: '',
                      }).then(function(satellite) {
                      console.log('ComSat Created : '+satellite.name);
                      });
                    } else if (AppUtils.isFileExists(certFile)) {
                      let cert = fs.readFileSync(certFile, "utf-8");
                      if (AppUtils.isValidCertificate(cert)) {
                          this.create({
                              name: name,
                              domain: domain,
                              publicIP: publicIP,
                              cert: AppUtils.trimCertificate(cert),
                          }).then(function(satellite) {
                              console.log('ComSat Created : '+satellite.name);
                          });
                      } else {
                          console.log('Error: Provided certificate is invalid. Try again with correct certificate.');
                      }
                    } else {
                      console.log('Error: Incorrect certificate file path. Try again with correct certificate file path');
                    }
                  }else {
                    console.log('Error: Following ComSat already exists with similar configurations: \n ' + satellite.name + ' (' + satellite.domain + ') ' + satellite.publicIP);
                  }
                });
            }else{
              console.log('ComSat publicIP is invalid. Try again with different ComSat publicIP.');
              console.log('Please provide values in following order:\n fog-controller comsat -add <name> <domain> <publicIP> [<certFile>]');
            }
        }else{
          console.log('ComSat domain is invalid. Try again with different ComSat domain.');
          console.log('Please provide values in following order:\n fog-controller comsat -add <name> <domain> <publicIP> [<certFile>]');
        }
      }else{
        console.log('ComSat name is invalid. Try again with different ComSat name.');
        console.log('Please provide values in following order:\n fog-controller comsat -add <name> <domain> <publicIP> [<certFile>]');
      }
    }else { 
      console.log('Please provide values in following order:\n fog-controller comsat -add <name> <domain> <publicIP> [<certFile>]');
    }
}

  removeSatellite(id) {
    if (id) {
      this.findBySatelliteId(id)
        .then(function(satellite) {
          if (satellite) {
            satellite.destroy();
            console.log('Success: ComSat deleted');
          } else {
            console.log('Error: Can not find ComSat having "' + id + '" as ID');
          }
        })
    } else {
      console.log('Please provide values in following order: fog-controller comsat -remove <id>');
    }
  }

  list() {
    this.find()
      .then(function(satellite) {
        if (satellite && satellite.length > 0) {
          console.log('\n\tID | ComSat Name | Domain | Public IP');
          for (let i = 0; i < satellite.length; i++) {
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