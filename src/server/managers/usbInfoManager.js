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
 * @author elukashick
 */

const USBInfo = require('./../models/usbInfo');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');
const sequelizeUtils = require('../utils/sequelizeUtils');

class USBInfoManager extends BaseManager {
    getEntity() {
        return USBInfoManager;
    }

    /**
     * @desc - finds usbInfoObj based on the uuid
     * @param uuid Integer
     * @return JSON - returns a JSON object of usbInfoObj
     */
    findByInstanceId(uuid) {
        return USBInfo.find({
            where: {
                iofog_uuid: uuid
            }
        });
    }

    /**
     * @desc - updates if usbInfoObj exists in db otherwise creates it
     * @param Integer - uuid
     * @return JSON - returns a JSON usbInfoObj
     */
    upsert(infoObj) {
        return this.findByInstanceId(infoObj.iofog_uuid)
            .then((dbObj) => {
                return null == dbObj ? this.save(infoObj) : this.update(infoObj)
            });
    }

    /**
     * @desc - updates
     * @param Integer, JSON object - uuid, usbInfoObj
     * @return Integer - returns the number of rows updated
     */
    update(infoObj) {
        return USBInfo.update(infoObj, {
            where: {
                iofog_uuid: infoObj.iofog_uuid
            }
        });
    }

    /**
     * @desc - saves info
     * @param JSON object - usbInfoObj
     * @return Integer - returns the number of rows created
     */
    save(infoObj) {
        return USBInfo.create(infoObj);
    }

    /**
     * @desc - deletes usbInfoObj based on the uuid
     * @param String - uuid
     * @return  Integer - returns the number of rows deleted
     */
    deleteByInstanceId(uuid) {
        return USBInfo.destroy({
            where: {
                iofog_uuid: uuid
            }
        });
    }
}

const instance = new USBInfoManager();
module.exports =  instance;