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

module.exports = {
  'App:Name': 'iofog-controller',

  'Server:Port': 54421,
  'Server:DevMode': false,

  'Email:ActivationEnabled': false,
  'Email:HomeUrl': 'https://iofog.org',

  'Service:LogsDirectory': '/var/log/iofog-controller',
  'Service:LogsFileSize': 1048576,

  'Settings:DefaultJobIntervalSeconds': 120,
  'Settings:UserTokenExpirationIntervalSeconds': 3600,
  'Settings:FogTokenExpirationIntervalSeconds': 3600,
  'Settings:FogStatusUpdateIntervalSeconds': 120,
  'Settings:FogStatusFrequencySeconds': 60,

  'Diagnostics:DiagnosticDir': 'diagnostic',
}