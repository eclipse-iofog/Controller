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
  INVALID_CLI_ARGUMENT_TYPE: 'Field "{}" is not of type(s) {}',
  DUPLICATE_NAME: 'Duplicate name \'{}\'',
  ALREADY_EXISTS: 'Model already exists',
  INVALID_CATALOG_ITEM_ID: 'Invalid catalog item id \'{}\'',
  INVALID_FLOW_ID: 'Invalid application id \'{}\'',
  INVALID_ROUTING_NAME: 'Invalid route name \'{}\'',
  INVALID_REGISTRY_ID: 'Invalid registry id \'{}\'',
  UNABLE_TO_CREATE_ACTIVATION_CODE: 'Unable to create activation code',
  UNABLE_TO_GET_ACTIVATION_CODE: 'Unable to create activation code',
  INVALID_IOFOG_UUID: 'Invalid ioFog UUID \'{}\'',
  INVALID_USER_EMAIL: 'Invalid user email',
  INVALID_MICROSERVICE_UUID: 'Invalid microservice UUID \'{}\'',
  INVALID_SOURCE_MICROSERVICE_UUID: 'Invalid source microservice UUID \'{}\'',
  INVALID_DEST_MICROSERVICE_UUID: 'Invalid destination microservice UUID \'{}\'',
  INVALID_MICROSERVICE_STRACE: 'Strace data for this microservice not found',
  INVALID_VOLUME_MAPPING_UUID: 'Invalid volume mapping id \'{}\'',
  ACTIVATION_CODE_NOT_FOUND: 'Activation code not found',
  INVALID_OLD_PASSWORD: 'Old password is incorrect',
  NEEDED_FORCE_DELETE_USER: 'There are running iofog-agents, stop them before removal or pass \'force\' parameter',
  ACCOUNT_NOT_FOUND: 'Account not found',
  USER_NOT_UPDATED: 'User not updated',
  EMAIL_NOT_ACTIVATED: 'Email is not activated. Please activate your account first.',
  REGISTRATION_FAILED: 'Registration failed: There is already an account associated with your email address. ' +
  'Please try logging in instead.',
  INVALID_PROVISIONING_KEY: 'Invalid Provisioning Key',
  EMAIL_SENDER_NOT_CONFIGURED: 'Email sender not configured',
  INVALID_PORT_FORMAT: 'Invalid port format',
  INVALID_FILE_PATH: 'Invalid file path',
  PORT_NOT_AVAILABLE: 'Port \'{}\' is not available',
  UNABLE_TO_WRITE_STRACE: 'Error while writing strace data to file. File name: \'{}\', err: \'{}\'',
  UNABLE_TO_DELETE_STRACE: 'Error while deleting strace data file. File name: \'{}\', err: \'{}\'',
  FTP_ERROR: 'FTP error: \'{}\'',
  EXPIRED_PROVISION_KEY: 'Expired provision key',
  VERSION_COMMAND_NOT_FOUND: 'Version command not found',
  STRACE_WITHOUT_FOG: 'Can\'t run strace for microservice without ioFog.',
  INVALID_ACTION_PROPERTY: 'Unknown action property. Action can be "open" or "close"',
  IMAGE_SNAPSHOT_NOT_FOUND: 'Image snapshot not found',
  INVALID_MICROSERVICES_FOG_TYPE: 'Some of microservices haven\'t proper docker images for this ioFog type. ' +
  'List of invalid microservices:\n',
  INVALID_MICROSERVICE_CONFIG: 'Can\'t create network microservice without appropriate configuration.',
  INVALID_MICROSERVICE_USER: 'Invalid microservice user or UUID',
  ROUTE_NOT_FOUND: 'Route not found',
  IMAGE_SNAPSHOT_WITHOUT_FOG: 'Can not run image snapshot for microservice without ioFog.',
  IMAGE_SNAPSHOT_NOT_AVAILABLE: 'Image snapshot is not available for this microservice.',
  FILE_DOES_NOT_EXIST: 'File does not exist.',
  MICROSERVICE_DOES_NOT_HAVE_IMAGES: 'Microservice {} does not have valid images',
  CATALOG_NOT_MATCH_IMAGES: 'Catalog item {} does not match provided images',
  RESTRICTED_PUBLISHER: 'You are not allowed to add catalog item as \'Eclipse ioFog\' publisher',
  REQUIRED_FOG_NODE: 'ioFog node is required.',
  PORT_MAPPING_ALREADY_EXISTS: 'Port mapping already exists',
  PORT_MAPPING_INTERNAL_PORT_NOT_PROVIDED: 'Internal port wasn\'t provided',
  VOLUME_MAPPING_ALREADY_EXISTS: 'Volume mapping already exists',
  INVALID_ROUTER_HOST: 'Invalid router host {}',
  CERT_PROPERTY_REQUIRED: 'Property "certificate" is required if property "requiresCert" is set to true',
  TUNNEL_NOT_FOUND: 'Tunnel not found',
  STRACE_NOT_FOUND: 'Strace not found',
  INVALID_CONTENT_TYPE: 'Invalid content type',
  UPLOADED_FILE_NOT_FOUND: 'Uploaded image snapshot file not found',
  REGISTRY_NOT_FOUND: 'Registry not found',
  USER_ALREADY_ACTIVATED: 'User is already activated.',
  USER_NOT_ACTIVATED_YET: 'User is not activated yet.',
  CLI: {
    INVALID_PORT_MAPPING: 'Port mapping parsing error. Please provide valid port mapping.',
    INVALID_VOLUME_MAPPING: 'Volume mapping parsing error. Please provide valid volume mapping.',
    INVALID_INTERNAL_PORT: 'Internal parsing error. Please provide valid internal port.',
    INVALID_ROUTE: 'Route parsing error. Please provide valid route.'
  },
  INVALID_VERSION_COMMAND_UPGRADE: 'Can\'t upgrade version now. Latest is already installed',
  INVALID_VERSION_COMMAND_ROLLBACK: 'Can\'t rollback version now. There are no backups on agent',
  CATALOG_ITEM_IMAGES_IS_FROZEN: 'Can\'t update catalog item images for item used for running microservices',
  CATALOG_UPDATE_NO_FIELDS: 'Add some parameters which should be updated.',
  CATALOG_UPDATE_REQUIRES_ID: 'Parameter \'--item-id\' is missing, update requires Catalog id.',
  SYSTEM_CATALOG_ITEM_UPDATE: 'Catalog item id {} is system and can\'t be updated',
  SYSTEM_CATALOG_ITEM_DELETE: 'Catalog item id {} is system and can\'t be deleted',
  SYSTEM_MICROSERVICE_UPDATE: 'Microservice uuid {} is system and can\'t be updated',
  SYSTEM_MICROSERVICE_DELETE: 'Microservice uuid {} is system and can\'t be deleted',
  INVALID_CONFIG_KEY: 'Unkown config key \'{}\'',
  INVALID_ROUTER: 'Invalid router \'{}\'',
  DUPLICATE_SYSTEM_FOG: 'There already is a system fog',
  INVALID_ROUTER_MODE: 'Invalid router mode \'{}\'',
  INVALID_UPSTREAM_ROUTER: 'Upstream router must be interior \'{}\'',
  EDGE_ROUTER_HAS_DOWNSTREAM: 'Edge router {} has, or will have, downstream routers',
  HOST_IS_REQUIRED: '"host" is required',
  PORT_RESERVED: 'Port \'{}\' is reserved for internal use',
  INVALID_HOST_TEMPLATE: '{} is not a valid host template',
  NOT_FOUND_HOST_TEMPLATE: 'Could not find {} host template',
  MISSING_IMAGE: 'Microservice {} does not have a valid image for its Agent type'
}
