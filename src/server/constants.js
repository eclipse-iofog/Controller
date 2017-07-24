/**
 * @file constants.js
 * @author Zishan Iqbal
 * @description This file includes the contant values that are used in the controllers;
 */

const ACCESS_TOKEN_EXPIRE_PERIOD = 14 * (60 * 60 * 24);

const MSG = {
  ERROR_INVALID_PROVISTION_KEY: 'Invalid key: The provisioning key you provided was not valid for granting access.',
  ERROR_PROVISION_KEY_EXPIRED: 'Expired key: The provisioning key you provided has expired.',
  ERROR_FOG_UNKNOWN: 'Fog Data not found.',
  ERROR_STREAMVIEWER_UNKNOWN: 'StreamViewer Data not found.',
  ERROR_CONSOLE_UNKNOWN: 'Console Data not found.',
  ERROR_ROUTING_UNKNOWN: 'Routing Data not found.',
  ERROR_FOG_MISMATCH: 'System error: Host architecture is different from selected fog instance.',
  ERROR_ACCESS_TOKEN_GEN: 'System error: There was a problem generating an access token for the key you provided.',
  ERROR_INVALID_FOG_USER: 'Invalid Fog user.',
  ERROR_USER_NOT_FOUND: 'User not found.',
  ERROR_UPDATING_USER: "Error in updating user.",
  ERROR_ACCESS_TOKEN: "Invalid token.",
  SYSTEM_ERROR: 'System error.',
  ERROR_ACCESS_DENIED: 'Access denied: you do not have acces to the instance Id you provided.',
  ERROR_CONTAINER_IMAGE: "Container error: There was a problem getting the container images.",
  ERROR_ACCESS_DENIED_INSTANCE: 'Access denied: You do not have access to the instance ID you provided.',
  ERROR_ACCESS_DENIED_TRACK: 'Permission error: You are not authorized to view the tracks for this ioFog instance.',

};

const CONFIG = {
  port: 'port',
  ssl_key: 'ssl_key',
  ssl_cert: 'ssl_cert',
  intermediate_cert: 'intermediate_cert',
  email_address: 'email_address',
  email_password: 'email_password',
  email_service: 'email_service',
  ioauthoring_port: 'ioauthoring_port',
  ioauthoring_ip_address: 'ioauthoring_ip_address',
  ioauthoring_protocol: 'ioauthoring_protocol'
};

export default {
  ACCESS_TOKEN_EXPIRE_PERIOD: ACCESS_TOKEN_EXPIRE_PERIOD,
  MSG: MSG,
  CONFIG: CONFIG
};