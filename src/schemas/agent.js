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

const agentProvision = {
  "id": "/agentProvision",
  "type": "object",
  "properties": {
    "type": {"type": "integer", "minimum": 0, "maximum": 2},
    "key": {"type": "string"}
  },
  "required": ["type", "key"]
};

const updateAgentConfig = {
  "id": "/updateAgentConfig",
  "type": "object",
  "properties": {
    "networkInterface": {"type": "string"},
    "dockerUrl": {"type": "string"},
    "diskLimit": {"type": "integer", "minimum": 0},
    "diskDirectory": {"type": "string"},
    "memoryLimit": {"type": "integer", "minimum": 0},
    "cpuLimit": {"type": "integer", "minimum": 0},
    "logLimit": {"type": "integer", "minimum": 0},
    "logDirectory": {"type": "string"},
    "logFileCount": {"type": "integer", "minimum": 0},
    "postStatusFreq": {"type": "integer", "minimum": 0},
    "getChangesFreq": {"type": "integer", "minimum": 0},
    "scanDevicesFreq": {"type": "integer", "minimum": 0},
    "watchdogEnabled": {"type": "boolean"},
    "gpsMode": {"type": "string"},
    "gpsCoordinates": {
      "type": "object",
      "properties": {
        "latitude": {"type": "number", "minimum": -90, "maximum": 90},
        "longitude": {"type": "number", "minimum": -180, "maximum": 180}
      }
    }
  }
};

const agentConfigChanges = {
  "id": "/agentConfigChanges",
  "type": "object",
  "properties": {
    "timestamp": {"type": "integer"}
  }
};

const updateAgentStatus = {
  "id": "/updateAgentStatus",
  "type": "object",
  "properties": {
    "daemonStatus": {"type": "string"},
    "daemonOperationDuration": {"type": "integer", "minimum": 0},
    "daemonLastStart": {"type": "integer", "minimum": 0},
    "memoryUsage": {"type": "integer", "minimum": 0},
    "diskUsage": {"type": "integer", "minimum": 0},
    "cpuUsage": {"type": "integer", "minimum": 0},
    "memoryViolation": {"type": "boolean"},
    "diskViolation": {"type": "boolean"},
    "cpuViolation": {"type": "boolean"},
    "microservicesStatus": {"type": "string"},
    "repositoryCount": {"type": "integer", "minimum": 0},
    "systemTime": {"type": "integer", "minimum": 0},
    "lastStatusTime": {"type": "integer", "minimum": 0},
    "ipAddress": {"type": "string"},
    "processedMessages": {"type": "integer", "minimum": 0},
    "microserviceMessageCounts": {"type": "string"},
    "messageSpeed": {"type": "integer", "minimum": 0},
    "lastCommandTime": {"type": "integer", "minimum": 0},
    "tunnelStatus": {"type": "string"},
    "version": {"type": "string"},
    "isReadyToUpgrade": {"type": "boolean"},
    "isReadyToRollback": {"type": "boolean"}
  }
};


const updateAgentStrace = {
  "id": "/updateAgentStrace",
  "type": "object",
  "properties": {
    "straceData": {
      "type": "array",
      "items": {"$ref": "/straceData"},
      "required": []
    }
  }
};

const straceData = {
  "id": "/straceData",
  "type": "object",
  "properties": {
    "microserviceId": {"type": "string"},
    "buffer": {"type": "string"},
  },
  "required": ["microserviceId", "buffer"]
};

module.exports = {
  mainSchemas: [agentProvision, updateAgentConfig, agentConfigChanges, updateAgentStatus, updateAgentStrace],
  innerSchemas: [straceData]
};