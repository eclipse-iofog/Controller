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
  'id': '/agentProvision',
  'type': 'object',
  'properties': {
    'type': { 'type': 'integer', 'minimum': 0, 'maximum': 2 },
    'key': { 'type': 'string' }
  },
  'required': ['type', 'key'],
  'additionalProperties': true
}

const agentDeprovision = {
  'id': '/agentDeprovision',
  'type': 'object',
  'properties': {
    'microserviceUuids': {
      'type': 'array',
      'items': { 'type': 'string' }
    }
  },
  'required': ['microserviceUuids'],
  'additionalProperties': true
}

const updateAgentConfig = {
  'id': '/updateAgentConfig',
  'type': 'object',
  'properties': {
    'networkInterface': { 'type': 'string' },
    'dockerUrl': { 'type': 'string' },
    'diskLimit': { 'type': 'integer', 'minimum': 0 },
    'diskDirectory': { 'type': 'string' },
    'memoryLimit': { 'type': 'integer', 'minimum': 0 },
    'cpuLimit': { 'type': 'integer', 'minimum': 0 },
    'logLimit': { 'type': 'integer', 'minimum': 0 },
    'logDirectory': { 'type': 'string' },
    'logFileCount': { 'type': 'integer', 'minimum': 0 },
    'statusFrequency': { 'type': 'integer', 'minimum': 0 },
    'changeFrequency': { 'type': 'integer', 'minimum': 0 },
    'deviceScanFrequency': { 'type': 'integer', 'minimum': 0 },
    'watchdogEnabled': { 'type': 'boolean' },
    'latitude': { 'type': 'number', 'minimum': -90, 'maximum': 90 },
    'longitude': { 'type': 'number', 'minimum': -180, 'maximum': 180 },
    'gpsMode': { 'type': 'string' },
    'dockerPruningFrequency': { 'type': 'integer', 'minimum': 0 },
    'availableDiskThreshold': { 'type': 'integer', 'minimum': 0 },
    'logLevel': { 'type': 'string' }
  },
  'additionalProperties': true
}

const updateAgentStatus = {
  'id': '/updateAgentStatus',
  'type': 'object',
  'properties': {
    'daemonStatus': { 'type': 'string' },
    'daemonOperatingDuration': { 'type': 'integer', 'minimum': 0 },
    'daemonLastStart': { 'type': 'integer', 'minimum': 0 },
    'memoryUsage': { 'type': 'number', 'minimum': 0 },
    'diskUsage': { 'type': 'number', 'minimum': 0 },
    'cpuUsage': { 'type': 'number', 'minimum': 0 },
    'memoryViolation': { 'type': 'boolean' },
    'diskViolation': { 'type': 'boolean' },
    'cpuViolation': { 'type': 'boolean' },
    'systemAvailableDisk': { 'type': 'integer' },
    'systemAvailableMemory': { 'type': 'integer' },
    'systemTotalCpu': { 'type': 'number' },
    'securityStatus': { 'type': 'string' },
    'securityViolationInfo': { 'type': 'string' },
    'microserviceStatus': { 'type': 'string' },
    'repositoryCount': { 'type': 'integer', 'minimum': 0 },
    'repositoryStatus': { 'type': 'string' },
    'systemTime': { 'type': 'integer', 'minimum': 0 },
    'lastStatusTime': { 'type': 'integer', 'minimum': 0 },
    'ipAddress': { 'type': 'string' },
    'ipAddressExternal': { 'type': 'string' },
    'processedMessages': { 'type': 'integer', 'minimum': 0 },
    'microserviceMessageCounts': { 'type': 'string' },
    'messageSpeed': { 'type': 'number', 'minimum': 0 },
    'lastCommandTime': { 'type': 'integer', 'minimum': 0 },
    'tunnelStatus': { 'type': 'string' },
    'version': { 'type': 'string' },
    'isReadyToUpgrade': { 'type': 'boolean' },
    'isReadyToRollback': { 'type': 'boolean' }
  },
  'additionalProperties': true
}

const updateAgentStrace = {
  'id': '/updateAgentStrace',
  'type': 'object',
  'properties': {
    'straceData': {
      'type': 'array',
      'items': { '$ref': '/straceData' },
      'required': []
    }
  },
  'additionalProperties': true
}

const straceData = {
  'id': '/straceData',
  'type': 'object',
  'properties': {
    'microserviceUuid': { 'type': 'string' },
    'buffer': { 'type': 'string' }
  },
  'required': ['microserviceUuid', 'buffer'],
  'additionalProperties': true
}

const microserviceStatus = {
  'id': '/microserviceStatus',
  'type': 'object',
  'properties': {
    'id': { 'type': 'string' },
    'containerId': { 'type': 'string' },
    'status': { 'type': 'string' },
    'startTime': { 'type': 'integer' },
    'operatingDuration': { 'type': 'integer' },
    'cpuUsage': { 'type': 'number' },
    'memoryUsage': { 'type': 'number' }
  },
  'required': ['id'],
  'additionalProperties': true
}

const updateHardwareInfo = {
  'id': '/updateHardwareInfo',
  'type': 'object',
  'properties': {
    'info': { 'type': 'string' }
  },
  'required': ['info'],
  'additionalProperties': true
}

const updateUsbInfo = {
  'id': '/updateUsbInfo',
  'type': 'object',
  'properties': {
    'info': { 'type': 'string' }
  },
  'required': ['info'],
  'additionalProperties': true
}

const trackingArray = {
  'id': '/trackingArray',
  'type': 'array',
  'items': { '$ref': '/trackingMessage' }
}

const trackingMessage = {
  'id': '/trackingMessage',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'sourceType': { 'type': 'string' },
    'timestamp': { 'type': 'number' },
    'type': { 'type': 'string' },
    'data': { '$ref': '/trackingData' }
  },
  'required': ['uuid', 'sourceType', 'timestamp', 'type', 'data'],
  'additionalProperties': true
}

const trackingData = {
  'id': '/trackingData',
  'type': 'object',
  'properties': {
  },
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [agentProvision, agentDeprovision, updateAgentConfig, updateAgentStatus, updateAgentStrace,
    updateHardwareInfo, updateUsbInfo, trackingArray],
  innerSchemas: [straceData, microserviceStatus, trackingData, trackingMessage]
}
