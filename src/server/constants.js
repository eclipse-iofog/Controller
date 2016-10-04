/**
 * @file constants.js
 * @author Zishan Iqbal
 * @description This file includes the contant values that are used in the controllers;
 */

const ACCESS_TOKEN_EXPIRE_PERIOD = 14 * (60 * 60 * 24);

const MSG = {
  ERROR_INVALID_PROVISTION_KEY: 'Invalid key: The provisioning key you provided was not valid for granting access.',
  ERROR_PROVISION_KEY_EXPIRED: 'Expired key: The provisioning key you provided has expired.',
  ERROR_FABRIC_UNKNOWN: 'Fabric Data not found.',
  ERROR_STREAMVIEWER_UNKNOWN: 'StreamViewer Data not found.',
  ERROR_CONSOLE_UNKNOWN: 'Console Data not found.',
  ERROR_ROUTING_UNKNOWN: 'Routing Data not found.',
  ERROR_FABRIC_MISMATCH: 'System error: Host architecture is different from selected fabric instance.',
  ERROR_ACCESS_TOKEN_GEN: 'System error: There was a problem generating an access token for the key you provided.',
  ERROR_INVALID_FABRIC_USER: 'Invalid Fabric user.',
  ERROR_USER_NOT_FOUND: 'User not found.',
  ERROR_UPDATING_USER: "Error in updating user.",
  ERROR_ACCESS_TOKEN: "Invalid token.",
  SYSTEM_ERROR: 'System error.',
  ERROR_ACCESS_DENIED: 'Access denied: you do not have acces to the instance Id you provided.',
  ERROR_CONTAINER_IMAGE: "Container error: There was a problem getting the container images.",
  ERROR_ACCESS_DENIED_INSTANCE: 'Access denied: You do not have access to the instance ID you provided.',
  ERROR_ACCESS_DENIED_TRACK: 'Permission error: You are not authorized to view the tracks for this ioFabric instance.',

};

const CONFIG = {
  PORT: 'PORT',
  SSL_KEY: 'SSL_KEY',
  SSL_CERT: 'SSL_CERT',
  INTERMEDIATE_CERT: 'INTERMEDIATE_CERT'
};

export default {
  ACCESS_TOKEN_EXPIRE_PERIOD: ACCESS_TOKEN_EXPIRE_PERIOD,
  MSG: MSG,
  CONFIG: CONFIG
};