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

const packageJson = require('../../package.json');
let {Help} = require('./Help');

class Version {
    static display = (args) => {
        if (args[1]) {
            Help.displayExtraArgumentHelp(args[1]);
        } else {
            console.log(`Version: ${packageJson.version}`);
            console.log(`License: ${packageJson.license.type} ( ${packageJson.license.url} )`);
            console.log(`${packageJson.description}`);
        }
    }
}

exports.Version = Version;