/**
 * @author elukashick
 */

import BaseManager from "./baseManager";
import ElementInstanceCleanUp from "../models/elementInstanceCleanUp";

/**
 * @author elukashick
 */

class ElementInstanceCleanUpManager extends BaseManager {
    getEntity() {
        return ElementInstanceCleanUp;
    }

    findByInstanceId(uuid) {
        return ElementInstanceCleanUp.find({
            where: {
                element_instance_uuid: uuid
            }
        });
    }

    create(obj) {
        return ElementInstanceCleanUp.create({
            elementInstanceUUID: obj.elementInstanceUUID,
            iofogUUID: obj.iofogUUID
        });
    }

    listByFogUUID(ioFogUUID) {
        return ElementInstanceCleanUp.findAll({
            where: {
                iofog_uuid: ioFogUUID
            }
        })
    }

    deleteByElementInstanceUUID(elementInstanceUUID) {
        return ElementInstanceCleanUp.destroy({
            where: {
                element_instance_uuid: elementInstanceUUID
            }
        });
    }

    deleteByFogUUID(fogUUID) {
        return ElementInstanceCleanUp.destroy({
            where: {
                iofogUUID: fogUUID
            }
        });
    }
}

const instance = new ElementInstanceCleanUpManager();
export default instance;