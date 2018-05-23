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
 * @file sslFileController.js
 * @author Zishan Iqbal
 * @description This file includes the CRUD operarions on ssl files.
 */

import _ from 'underscore';
import AppUtils from './appUtils';
import FogControllerConfigManager from './../managers/fogControllerConfigManager';
import Constants from './../constants';

class FogControllerConfigUtil {

    getConfigParam(key) {
        let configValue;

        if (!this.fogConfigs) {
            return undefined;
        } else {
            _.each(this.fogConfigs, function (config) {
                if (config.key.toLowerCase() === key.toLowerCase()) {
                    configValue = config.value;
                    return;
                }
            });
            return configValue;
        }
    }

    setConfigParam(key, value) {
        if (this.isKeyExist(key)) {
            if (this.validateValue(key, value)) {
                if (key == Constants.CONFIG.port) {
                    AppUtils.checkPortAvailability(value).then(availability => {
                        if (availability == 'closed') {
                            return FogControllerConfigManager.setByKey(key, value).then(result => {
                                console.log('"' + key + '" has been updated successfully.');
                            });
                        } else {
                            console.log('Port "' + value + '" is not available.');
                        }
                    });
                } else {
                    return FogControllerConfigManager.setByKey(key, value).then(result => {
                        console.log('"' + key + '" has been updated successfully.');
                    });
                }
            } else {
                throw 'Invalid value provided for key "' + key + '"';
            }
        } else {
            throw '"' + key + '" is not a valid property. You can set properties like: \nport, ssl_key, ssl_cert, intermediate_cert, ' +
            '\nemail_address, email_password, email_service, \nioauthoring_port, ioauthoring_ip_address, ioauthoring_protocol, ' +
            '\nemail_activation [on | off]';
        }
    }

    isKeyExist(configKey) {
        return _.find(Constants.CONFIG, function (value, key) {
            if (configKey.toLowerCase() == key.toLowerCase()) {
                return true;
            }
        });
    }

    validateValue(key, value) {
        if (key == Constants.CONFIG.port || key == Constants.CONFIG.ioauthoring_port) {
            return AppUtils.isValidPort(value);
        } else if (key.toLowerCase() == Constants.CONFIG.email_service || key.toLowerCase() == Constants.CONFIG.email_password || key.toLowerCase() == Constants.CONFIG.email_address) {
            return true;
        } else if (key.toLowerCase() == Constants.CONFIG.ssl_key || key.toLowerCase() == Constants.CONFIG.ssl_cert || key.toLowerCase() == Constants.CONFIG.intermediate_cert) {
            return AppUtils.isFileExists(value);
        } else if (key.toLowerCase() == Constants.CONFIG.ioauthoring_ip_address) {
            return AppUtils.isValidPublicIP(value);
        } else if (key.toLowerCase() == Constants.CONFIG.ioauthoring_protocol) {
            return AppUtils.isValidProtocol(value);
        } else if (key.toLowerCase() == Constants.CONFIG.email_activation) {
            return AppUtils.isValidEmailActivation(value);
        } else if (key.toLowerCase() == Constants.CONFIG.email_server) {
            return AppUtils.isValidDomain(value);
        } else if (key.toLowerCase() == Constants.CONFIG.email_serverport) {
            return AppUtils.isValidPort(value);
        }
    }

    getAllConfigs() {
        return FogControllerConfigManager.find()
            .then(function (configs) {
                this.fogConfigs = configs;
                return configs;
            }.bind(this));
    }
}

const instance = new FogControllerConfigUtil();
export default instance;