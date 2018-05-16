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

import BaseManager from "./baseManager";
import ElementInstanceToCleanUp from "../models/elementInstanceToCleanUp";

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