/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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
  ROOT_DIR: `${__dirname}/../..`,

  CMD: 'command',
  CMD_LIST: 'list',
  CMD_ADD: 'add',
  CMD_UPDATE: 'update',
  CMD_REMOVE: 'remove',
  CMD_INFO: 'info',
  CMD_PROVISIONING_KEY: 'provisioning-key',
  CMD_HELP: 'help',
  CMD_START: 'start',
  CMD_STOP: 'stop',
  CMD_INIT_DB: 'init',
  CMD_STATUS: 'status',
  CMD_VERSION: 'version',
  CMD_USER: 'user',
  CMD_CONFIG: 'config',
  CMD_TUNNEL: 'tunnel',
  CMD_IOFOG: 'iofog',
  CMD_GENERATE_TOKEN: 'generate-token',
  CMD_CATALOG: 'catalog',
  CMD_FLOW: 'application',
  CMD_MICROSERVICE: 'microservice',
  CMD_ROUTE_CREATE: 'route-create',
  CMD_ROUTE_REMOVE: 'route-remove',
  CMD_PORT_MAPPING_CREATE: 'port-mapping-create',
  CMD_PORT_MAPPING_REMOVE: 'port-mapping-remove',
  CMD_PORT_MAPPING_LIST: 'port-mapping-list',
  CMD_VOLUME_MAPPING_CREATE: 'volume-mapping-create',
  CMD_VOLUME_MAPPING_REMOVE: 'volume-mapping-remove',
  CMD_VOLUME_MAPPING_LIST: 'volume-mapping-list',
  CMD_REGISTRY: 'registry',
  CMD_ACTIVATE: 'activate',
  CMD_SUSPEND: 'suspend',
  CMD_DEV_MODE: 'dev-mode',
  CMD_IOFOG_REBOOT: 'reboot',
  CMD_CONTROLLER: 'controller',
  CMD_EMAIL_ACTIVATION: 'email-activation',
  CMD_FOG_TYPES: 'fog-types',
  CMD_DIAGNOSTICS: 'diagnostics',
  CMD_STRACE_UPDATE: 'strace-update',
  CMD_STRACE_INFO: 'strace-info',
  CMD_STRACE_FTP_POST: 'strace-ftp-post',
  CMD_IMAGE_SNAPSHOT_CREATE: 'image-snapshot-create',
  CMD_IMAGE_SNAPSHOT_GET: 'image-snapshot-get',
  CMD_HAL_HW: 'hal-hw',
  CMD_HAL_USB: 'hal-usb',
  CMD_IOFOG_PRUNE: 'prune',
  HTTP_CODE_SUCCESS: 200,
  HTTP_CODE_CREATED: 201,
  HTTP_CODE_ACCEPTED: 202,
  HTTP_CODE_NO_CONTENT: 204,
  HTTP_CODE_SEE_OTHER: 303,
  HTTP_CODE_BAD_REQUEST: 400,
  HTTP_CODE_UNAUTHORIZED: 401,
  HTTP_CODE_NOT_FOUND: 404,
  HTTP_CODE_DUPLICATE_PROPERTY: 409,
  HTTP_CODE_INTERNAL_ERROR: 500,

  DEFAULT_ROUTER_NAME: 'default-router',
  DEFAULT_PROXY_HOST: 'default-proxy-host',

  RESERVED_PORTS: [54321, 54322],

  VOLUME_MAPPING_DEFAULT: 'bind'
}
