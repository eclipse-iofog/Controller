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

const CONFIG = {
  port: 'port',
  ssl_key: 'ssl_key',
  ssl_cert: 'ssl_cert',
  intermediate_cert: 'intermediate_cert',
  email_address: 'email_address',
  email_password: 'email_password',
  email_service: 'email_service',
  email_server: 'email_server',
  email_serverport: 'email_serverport',
  email_activation: 'email_activation',
  proxy_username: 'proxy_username',
  proxy_password: 'proxy_password',
  proxy_host: 'proxy_host',
  proxy_lport: 'proxy_lport',
  proxy_rsa_key: 'proxy_rsa_key'
};

module.exports = {
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
  CMD_STATUS: 'status',
  CMD_VERSION: 'version',
  CMD_USER: 'user',
  CMD_CONFIG: 'config',
  CMD_COMSAT: 'comsat',
  CMD_PROXY: 'proxy',
  CMD_IOFOG: 'iofog',
  CMD_GENERATE_TOKEN: 'generate-token',
  CMD_CATALOG: 'catalog',
  CMD_FLOW: 'flow',
  CMD_MICROSERVICE: 'microservice',
  CMD_ROUTE: 'route',
  CMD_REGISTRY: 'registry',
  CMD_ACTIVATE: 'activate',
  CMD_SUSPEND: 'suspend',
  CMD_STRACE: 'strace',
  CMD_TUNNEL: 'tunnel',
  CONFIG: CONFIG,
  HTTP_CODE_SUCCESS: 200,
  HTTP_CODE_CREATED: 201,
  HTTP_CODE_NO_CONTENT: 204,
  HTTP_CODE_BAD_REQUEST: 400,
  HTTP_CODE_UNAUTHORIZED: 401,
  HTTP_CODE_NOT_FOUND: 404,
  HTTP_CODE_INTERNAL_ERROR: 500,
}