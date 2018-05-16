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

import fogControllerConfigManager from '../managers/fogControllerConfigManager';

const configList = function() {
  fogControllerConfigManager.list()
  	.then(function(config) {
        if (config && config.length > 0) {
        	console.log('\nFollowing is the configuration information:');
        	for (let i = 0; i < config.length; i++){
        		console.log(config[i].key + ' | ' + config[i].value);
        	}
        }else{
        	console.log('\nNo Configuration Data Found.');
        }
    })
}
export default {
configList: configList
}