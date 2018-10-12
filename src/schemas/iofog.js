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

const iofogCreate = {
  "id": "/iofogCreate",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"},
    "name": {"type": "string", "minLength": 1},
    "location": {"type": "string"},
    "latitude": {"type": "number", "minimum": -90, "maximum": 90},
    "longitude": {"type": "number", "minimum": -180, "maximum": 180},
    "description": {"type": "string"},
    "dockerUrl": {"type": "string"},
    "diskLimit": {"type": "integer", "minimum": 0},
    "diskDirectory": {"type": "string"},
    "memoryLimit": {"type": "integer", "minimum": 0},
    "cpuLimit": {"type": "integer", "minimum": 0},
    "logLimit": {"type": "integer", "minimum": 0},
    "logDirectory": {"type": "string"},
    "logFileCount": {"type": "integer", "minimum": 0},
    "statusFrequency": {"type": "integer", "minimum": 0},
    "changeFrequency": {"type": "integer", "minimum": 0},
    "deviceScanFrequency": {"type": "integer", "minimum": 0},
    "bluetoothEnabled": {"type": "boolean"},
    "watchdogEnabled": {"type": "boolean"},
    "abstractedHardwareEnabled": {"type": "boolean"},
    "fogType": {"type": "integer", "minimum": 0, "maximum": 2}
  },
  "required": ["name", "fogType"]
};

const iofogUpdate = {
  "id": "/iofogUpdate",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"},
    "name": {"type": "string", "minLength": 1},
    "location": {"type": "string"},
    "latitude": {"type": "number", "minimum": -90, "maximum": 90},
    "longitude": {"type": "number", "minimum": -180, "maximum": 180},
    "description": {"type": "string"},
    "dockerUrl": {"type": "string"},
    "diskLimit": {"type": "integer", "minimum": 0},
    "diskDirectory": {"type": "string"},
    "memoryLimit": {"type": "integer", "minimum": 0},
    "cpuLimit": {"type": "integer", "minimum": 0},
    "logLimit": {"type": "integer", "minimum": 0},
    "logDirectory": {"type": "string"},
    "logFileCount": {"type": "integer", "minimum": 0},
    "statusFrequency": {"type": "integer", "minimum": 0},
    "changeFrequency": {"type": "integer", "minimum": 0},
    "deviceScanFrequency": {"type": "integer", "minimum": 0},
    "bluetoothEnabled": {"type": "boolean"},
    "watchdogEnabled": {"type": "boolean"},
    "abstractedHardwareEnabled": {"type": "boolean"},
    "fogType": {"type": "integer", "minimum": 0, "maximum": 2}
  },
  "required": ["uuid"]
};

const iofogDelete = {
  "id": "/iofogDelete",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"}
  },
  "required": ["uuid"]
};

const iofogGet = {
  "id": "/iofogGet",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"}
  },
  "required": ["uuid"]
};

const iofogGenerateProvision = {
  "id": "/iofogGenerateProvision",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"}
  },
  "required": ["uuid"]
};

const iofogSetVersionCommand = {
  "id": "/iofogSetVersionCommand",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"},
    "versionCommand": {"enum": ["upgrade", "rollback"]}
  },
  "required": ["uuid", "versionCommand"]
};

const iofogReboot = {
  "id": "/iofogReboot",
  "type": "object",
  "properties": {
    "uuid": {"type": "string"}
  },
  "required": ["uuid"]
};

const iofogFilters = {
  "id": "/iofogFilters",
  "type": "array",
  "items": {"$ref": "/filter"},
  "required": []
};

const filter = {
  "id": "/filter",
  "type": "object",
  "properties": {
    "key": {"type": "string"},
    "value": {"type": "string"},
    "condition": {"enum": ["has", "equals"]}
  },
  "required": ["key", "value", "condition"]
};

module.exports = {
  mainSchemas: [iofogCreate, iofogUpdate, iofogDelete,
    iofogGet, iofogGenerateProvision, iofogSetVersionCommand,
    iofogReboot, iofogFilters],
  innerSchemas: [filter]
};