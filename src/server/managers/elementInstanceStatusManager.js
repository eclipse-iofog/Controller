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