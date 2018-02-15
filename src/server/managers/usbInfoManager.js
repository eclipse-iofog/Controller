/**
 * @author elukashick
 */

import USBInfo from './../models/usbInfo';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';
import sequelizeUtils from "../utils/sequelizeUtils";

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
                return null == dbObj ? this.saveInfo(infoObj) : this.updateInfo(infoObj)
            });
    }

    /**
     * @desc - updates
     * @param Integer, JSON object - uuid, usbInfoObj
     * @return Integer - returns the number of rows updated
     */
    updateInfo(infoObj) {
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
    saveInfo(infoObj) {
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
export default instance;