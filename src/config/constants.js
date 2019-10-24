/*
 *  *******************************************************************************
 *  * Copyright (c) 2019 Edgeworx, Inc.
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
  'Viewer:Port': 80,

  'Server:Port': 51121,
  'Server:DevMode': false,

  'Email:ActivationEnabled': false,
  'Email:HomeUrl': 'https://iofog.org',

  'Service:LogsDirectory': '/var/log/iofog-controller',
  'Service:LogsFileSize': 10485760,
  'Service:LogsFileCount': 10,

  'Settings:DefaultJobIntervalSeconds': 120,
  'Settings:UserTokenExpirationIntervalSeconds': 3600,
  'Settings:FogTokenExpirationIntervalSeconds': 3600,
  'Settings:KubeletTokenExpirationIntervalSeconds': 3600,
  'Settings:SchedulerTokenExpirationIntervalSeconds': 3600,
  'Settings:FogStatusUpdateIntervalSeconds': 120,
  'Settings:FogStatusFrequencySeconds': 60,

  'Diagnostics:DiagnosticDir': 'diagnostic'
}
