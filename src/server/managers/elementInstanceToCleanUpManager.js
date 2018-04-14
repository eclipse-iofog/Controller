/**
 * @author elukashick
 */

import BaseManager from "./baseManager";
import ElementInstanceToCleanUp from "../models/elementInstanceToCleanUp";

/**
 * @author elukashick
 */

class ElementInstanceToCleanUpManager extends BaseManager {
    getEntity() {
        return ElementInstanceToCleanUp;
    }

    findByInstanceId(uuid) {
        return ElementInstanceToCleanUp.find({
            where: {
                element_instance_uuid: uuid
            }
        });
    }

    create(obj) {
        return ElementInstanceToCleanUp.create({
            elementInstanceUUID: obj.elementInstanceUUID,
            iofogUUID: obj.iofogUUID
        });
    }

    listByFogUUID(ioFogUUID) {
        return ElementInstanceToCleanUp.findAll({
            where: {
                iofog_uuid: ioFogUUID
            }
        })
    }

    deleteByElementInstanceUUID(elementInstanceUUID) {
        return ElementInstanceToCleanUp.destroy({
            where: {
                element_instance_uuid: elementInstanceUUID
            }
        });
    }

    deleteByFogUUID(fogUUID) {
        return ElementInstanceToCleanUp.destroy({
            where: {
                iofogUUID: fogUUID
            }
        });
    }
}

const instance = new ElementInstanceToCleanUpManager();
export default instance;