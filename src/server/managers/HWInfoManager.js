/**
 * @file HWInfoManager.js
 * @author elukashick
 * @description
 */

import HWInfo from './../models/hwInfo';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class HWInfoManager extends BaseManager {
    getEntity() {
        return HWInfoManager;
    }

    /**
     * @desc - finds info based on the uuid
     * @param Integer - uuid
     * @return JSON - returns a JSON object of hwInfo
     */
    findByInstanceId(uuid) {
        return HWInfo.find({
            where: {
                iofog_uuid: uuid
            }
        });
    }

    /**
     * @desc - updates
     * @param Integer, JSON object - uuid, infoObj
     * @return Integer - returns the number of rows updated
     */
    update(infoObj) {
        return HWInfo.update(infoObj, {
            where: {
                iofog_uuid: infoObj.iofog_uuid
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
     * @desc - saves infoObj
     * @param JSON object - infoObj
     * @return Integer - returns the number of rows created
     */
    save(infoObj) {
        return HWInfo.create(infoObj);
    }

    /**
     * @desc - deletes the info based on the uuid
     * @param String - uuid
     * @return  Integer - returns the number of rows deleted
     */
    deleteByInstanceId(uuid) {
        return HWInfo.destroy({
            where: {
                iofog_uuid: uuid
            }
        });
    }
}

const instance = new HWInfoManager();
export default instance;