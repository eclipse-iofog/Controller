import BaseManager from "./baseManager";
import ElementInstanceStatus from "../models/elementInstanceStatus";
import ElementInstanceManager from "../managers/elementInstanceManager";

/**
 * @author elukashick
 */

class ElementInstanceStatusManager extends BaseManager {
    getEntity() {
        return ElementInstanceStatus;
    }

    findByInstanceId(uuid) {
        return ElementInstanceStatus.find({
            where: {
                element_instance_uuid: uuid
            }
        });
    }

    update(obj) {
        return ElementInstanceStatus.update(obj, {
            where: {
                element_instance_uuid: obj.uuid
            }
        });
    }

    create(obj) {
        return ElementInstanceStatus.create({
            status: obj.status,
            cpuUsage: obj.cpuUsage,
            memoryUsage: obj.memoryUsage,
            containerId: obj.containerId,
            element_instance_uuid: obj.uuid
        });
    }

    upsertStatus(obj) {
        return ElementInstanceManager.findByUuId(obj.uuid)
            .then((elementInstanceObj) => {
                return null == elementInstanceObj ? null :
                    this.findByInstanceId(obj.uuid).then((dbObj) => {
                        return null == dbObj ? this.create(obj) : this.update(obj)
                    });
            });
    }
}

const instance = new ElementInstanceStatusManager();
export default instance;