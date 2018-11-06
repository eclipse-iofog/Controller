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
  DUPLICATE_NAME: 'Duplicate name {}',
  ALREADY_EXISTS: 'Model already exists',
  INVALID_CATALOG_ITEM_ID: 'Invalid catalog item id {}',
  INVALID_FLOW_ID: 'Invalid flow id {}',
  INVALID_REGISTRY_ID: 'Invalid registry id {}',
  INVALID_CONNECTOR_IP: 'Invalid connector IP {}',
  UNABLE_TO_CREATE_ACTIVATION_CODE: 'Unable to create activation code',
  UNABLE_TO_GET_ACTIVATION_CODE: 'Unable to create activation code',
  INVALID_FOG_NODE_UUID: 'Invalid ioFog UUID {}',
  INVALID_USER_EMAIL: 'Invalid user email',
  INVALID_MICROSERVICE_UUID: "Invalid microservice UUID '{}'",
  ACTIVATION_CODE_NOT_FOUND: 'Activation code not found',
  INVALID_OLD_PASSWORD: 'Old password is incorrect',
  ACCOUNT_NOT_FOUND: 'Account not found',
  USER_NOT_UPDATED: 'User not updated',
  EMAIL_NOT_ACTIVATED: 'Email is not activated. Please activate your account first.',
  REGISTRATION_FAILED: 'Registration failed: There is already an account associated with your email address. Please try logging in instead.',
  INVALID_NODE_ID: 'Invalid ioFog UUID',
  INVALID_PROVISIONING_KEY: 'Invalid Provisioning Key',
  EMAIL_SENDER_NOT_CONFIGURED: 'Email sender not configured',
  INVALID_PORT_FORMAT: 'Invalid port format',
  INVALID_FILE_PATH: 'Invalid file path',
  PORT_NOT_AVAILABLE: 'Port {} not available',
  UNABLE_TO_WRITE_STRACE: 'Error while writing strace data to file. File name: {}, err: {}',
  UNABLE_TO_DELETE_STRACE: 'Error while deleting strace data file. File name: {}, err: {}',
  FTP_ERROR: 'FTP error: {}',
  EXPIRED_PROVISION_KEY: 'Expired provision key',
  VERSION_COMMAND_NOT_FOUND: 'Version command not found',
  STRACE_WITHOUT_FOG: "Can't run strace for microservice without ioFog.",
  INVALID_ACTION_PROPERTY: 'Unknown action property. Action can be "open" or "close"',
  IMAGE_SNAPSHOT_NOT_FOUND: 'Image snapshot not found',
  INVALID_MICROSERVICES_FOG_TYPE: 'Some of microservices haven\'t proper docker images for this ioFog type. List of invalid microservices:\n',
  INVALID_MICROSERVICE_CONFIG: "Can't create network microservice without appropriate configuration.",
  INVALID_MICROSERVICE_USER: 'Invalid microservice user or UUID',
  ROUTE_NOT_FOUND: 'Route not found',
  IMAGE_SNAPSHOT_WITHOUT_FOG: 'Can not run image snapshot for microservice without ioFog.',
  FILE_DOES_NOT_EXIST: 'File does not exist.',
  RESTRICTED_PUBLISHER: "You are not allowed to add catalog item as 'Eclipse ioFog' publisher",
  REQUIRED_FOG_NODE: 'ioFog node is required.',
  INVALID_CONNECTOR_DOMAIN: 'Invalid connector domain {}',
  CERT_PROPERTY_REQUIRED: 'Property "certificate" is required if property "requiresCert" is set to true',
  TUNNEL_NOT_FOUND: 'Tunnel not found',
  STRACE_NOT_FOUND: 'Strace not found',
  INVALID_CONTENT_TYPE: 'Invalid content type',
  UPLOADED_FILE_NOT_FOUND: 'Uploaded image snapshot file not found',
  CLI: {
    INVALID_PORT_MAPPING: 'Port mapping parsing error. Please provide valid port mapping.',
    INVALID_VOLUME_MAPPING: 'Volume mapping parsing error. Please provide valid volume mapping.',
    INVALID_INTERNAL_PORT: 'Internal parsing error. Please provide valid internal port.',
    INVALID_ROUTE: 'Route parsing error. Please provide valid route.'
  }
};
