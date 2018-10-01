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
 * @file fogProvisionKeyManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogProvisionKey Model.
 */
const BaseManager = require('./../managers/baseManager');

const Fog = require('./../models/fog');
const FogProvisionKey = require('./../models/fogProvisionKey');

class FogProvisionKeyManager extends BaseManager {

    /**
     * @desc - creates a new ProvisionKey with the param data
     * @param JSON object - newProvision
     * @return JSON object - returns the created object
     */
  createProvisionKey(newProvision) {
    return FogProvisionKey.create(newProvision);
  }

  findByInstanceId(instanceId) {
      return FogProvisionKey.find({
        where: {
          iofog_uuid: instanceId
        }
      });
    }

  /**
   * @desc - deletes the fog provision key based on the instanceId
   * @param String - instanceId
   * @return  Integer - returns the number of rows deleted
   */
  deleteByInstanceId(instanceId) {
    return FogProvisionKey.destroy({
      where: {
        iofog_uuid: instanceId
      }
    });
  }

  /**
     * @desc - removes the provisionKey based on the key from the database
     * @param String - key
     * @return Integer - returns the number of rows deleted
     */
  deleteByProvisionKey(key) {
      return FogProvisionKey.destroy({
        where: {
          provisionKey: key
        }
      });
    }

  getEntity() {
      return FogProvisionKey;
    }
    /**
     * @desc - finds the provisionKey based on the key parameter
     * @param String - key
     * @return JSON - returns a JSON object of fogProvisionKey including the fog it belongs to
     */
  getByProvisionKey(key) {
      return FogProvisionKey.findOne({
        where: {
          provisionKey: key
        },
        include: [Fog]
      });
    }

  deleteExpiredProvisionKeys(pastTime){
    return FogProvisionKey.destroy({
      where: {
        expirationTime:{
          $lt: pastTime
        }
      }
    });
  }
}

const instance = new FogProvisionKeyManager();
module.exports =  instance;