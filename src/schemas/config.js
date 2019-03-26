/*
 *  *******************************************************************************
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

const configUpdate = {
  'id': '/configUpdate',
  'type': 'object',
  'properties': {
    'port': {'type': 'integer', 'minimum': 0, 'maximum': 65535},
    'sslCert': {'type': 'string'},
    'sslKey': {'type': 'string'},
    'intermediateCert': {'type': 'string'},
    'emailActivationOn': {'type': 'boolean'},
    'emailActivationOff': {'type': 'boolean'},
    'homeUrl': {'type': 'string'},
    'emailAddress': {'type': 'string'},
    'emailPassword': {'type': 'string', 'minLength': 1},
    'emailService': {'type': 'string'},
    'logDir': {'type': 'string'},
    'logSize': {'type': 'integer'},
    'kubelet': {'type': 'string'},
  },
}

module.exports = {
  mainSchemas: [configUpdate],
  innerSchemas: [],
}
