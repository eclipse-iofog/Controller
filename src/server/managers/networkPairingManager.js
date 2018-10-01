/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file networkPairingManager.js
 * @author Zishan Iqbal
 * @description
 */

const NetworkPairing = require('./../models/networkPairing');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');

class NetworkPairingManager extends BaseManager {

  getEntity() {
    return NetworkPairing;
  }

  findByElemen1PortIds(portIds) {
    return NetworkPairing.findAll({
      where: {
        'elemen1PortId': {
          $in: portIds
        }
      }
    });
  }

  findNetworkPairingElemenId1ByUuids(uuids) {
    const query = 'select distinct(elementId1) from network_pairing where networkElementId2 in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

  findNetworkPairingElemenId2ByUuids(uuids) {
    const query = 'select distinct(elementId2) from network_pairing where networkElementId1 in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

  findByFogAndElement(fogInstanceId1, fogInstanceId2, elementId1, elementId2) {
    return NetworkPairing.findOne({
      where: {
        'instanceId1': fogInstanceId1,
        'instanceId2': fogInstanceId2,
        'elementId1': elementId1,
        'elementId2': elementId2
      }
    });
  }

  findByElementIds(elementId) {
    return NetworkPairing.findAll({
      where: {
        $or: [{
          elementId1: elementId
        }, {
          elementId2: elementId
        }]
      }
    });
  }
  deleteByElementId1(elementId) {
    return NetworkPairing.destroy({
      where: {
          elementId1: elementId
      }
    });
  }

  deleteByElementId(elementId) {
    return NetworkPairing.destroy({
      where: {
        $or: [{
          elementId1: {
            $eq: elementId
          }
        }, {
          elementId2: {
            $eq: elementId
          }
        }]
      }
    });
  }

}

const instance = new NetworkPairingManager();
module.exports =  instance;