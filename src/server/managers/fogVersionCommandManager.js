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
 * @file fogVersionCommandManager.js
 * @author Maksim Chepelev
 * @description This file includes the CURD operations for the versionCommand Model.
 */
import BaseManager from './../managers/baseManager';

import FogVersionCommand from "../models/fogVersionCommand";

class FogVersionCommandManager extends BaseManager {

    createVersionCommand(newVersionCommand) {
        return FogVersionCommand.create(newVersionCommand);
    }

    findByInstanceId(instanceId) {
        return FogVersionCommand.find({
            where: {
                iofog_uuid: instanceId
            }
        });
    }

    deleteByInstanceId(instanceId) {
        return FogVersionCommand.destroy({
            where: {
                iofog_uuid: instanceId
            }
        });
    }

    getEntity() {
        return FogVersionCommand;
    }
    
}

const instance = new FogVersionCommandManager();
export default instance;