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

const comsatCreate = {
  "id": "/comsatCreate",
  "type": "object",
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "domain": {"type": "string", "minLength": 4},
    "publicIp": {"type": "string", "minLength": 7},
    "certDir": {"type": "string"},
    "isSelfSignedCert": {"type": "boolean"},
  },
  "required": ["publicIp", "name"]
};

const comsatUpdate = {
  "id": "/comsatUpdate",
  "type": "object",
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "domain": {"type": "string", "minLength": 4},
    "publicIp": {"type": "string", "minLength": 7},
    "certDir": {"type": "string"},
    "isSelfSignedCert": {"type": "boolean"},
  },
  "required": ["publicIp"]
};

const comsatDelete = {
  "id": "/comsatDelete",
  "type": "object",
  "properties": {
    "publicIp": {"type": "string", "minLength": 7}
  },
  "required": ["publicIp"]
};

module.exports = {
  mainSchemas: [comsatCreate, comsatUpdate, comsatDelete],
  innerSchemas: []
};