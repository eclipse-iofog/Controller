/**
 * @file rebootManager.js
 * @author Alex Shpak
 * @description This file includes the CURD operations for the reboot Model.
 */

import BaseManager from './../managers/baseManager';
import Reboot from './../models/reboot';
import sequelize from './../utils/sequelize';

class RebootManager extends BaseManager {

    findByInstanceId(instanceId) {
        return Reboot.findAll({
            where: {
                $or: [{
                    iofog_uuid: instanceId
                }, {
                    ispublic: {
                        $gt: 0
                    }
                }]
            }
        });
    }
}

const instance = new RebootManager();
export default instance;