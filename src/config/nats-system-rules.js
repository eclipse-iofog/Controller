'use strict'

const SYSTEM_ACCOUNT_RULE_NAME = 'default-system-account'
const APPLICATION_ACCOUNT_RULE_NAME = 'default-account'
const MICROSERVICE_USER_RULE_NAME = 'default-user'
const MQTT_BEARER_USER_RULE_NAME = 'default-mqtt-user'
const DEFAULT_LEAF_USER_RULE_NAME = 'default-leaf-user'
const CONTROLLER_ACCOUNT_RULE_NAME = 'controller-account'
const CONTROLLER_USER_RULE_NAME = 'controller-user'
const CONTROLLER_NATS_RELAY_SUBJECT_ALLOW = 'controller.relay.v1.>'

const SYS_ACCOUNT_EXPORTS_INLINE = Object.freeze([
  Object.freeze({
    name: 'account-monitoring-streams',
    subject: '$SYS.ACCOUNT.*.>',
    type: 'stream',
    account_token_position: 3,
    description: 'Account specific monitoring stream',
    info_url: 'https://docs.nats.io/nats-server/configuration/sys_accounts'
  }),
  Object.freeze({
    name: 'account-monitoring-services',
    subject: '$SYS.REQ.ACCOUNT.*.*',
    type: 'service',
    response_type: 'Stream',
    account_token_position: 4,
    description: 'Request account specific monitoring services for: SUBSZ, CONNZ, LEAFZ, JSZ and INFO',
    info_url: 'https://docs.nats.io/nats-server/configuration/sys_accounts'
  })
])

const ACCOUNT_RULES = Object.freeze([
  Object.freeze({
    name: SYSTEM_ACCOUNT_RULE_NAME,
    description: 'Default system account rule',
    exports: SYS_ACCOUNT_EXPORTS_INLINE,
    maxLeafNodeConnections: -1,
    maxImports: -1,
    maxExports: -1,
    maxConnections: -1,
    maxData: -1,
    maxMsgPayload: -1,
    maxSubscriptions: -1,
    exportsAllowWildcards: true
  }),
  Object.freeze({
    name: APPLICATION_ACCOUNT_RULE_NAME,
    description: 'Default application account rule',
    memStorage: -1,
    diskStorage: -1,
    streams: -1,
    maxAckPending: -1,
    memMaxStreamBytes: -1,
    diskMaxStreamBytes: -1,
    consumer: -1,
    maxLeafNodeConnections: -1,
    maxImports: -1,
    maxExports: -1,
    maxConnections: -1,
    maxData: -1,
    maxMsgPayload: -1,
    maxSubscriptions: -1,
    exportsAllowWildcards: true
  }),
  Object.freeze({
    name: CONTROLLER_ACCOUNT_RULE_NAME,
    description: 'Controller WebSocket relay account with standard app limits, no exports',
    memStorage: -1,
    diskStorage: -1,
    streams: -1,
    maxAckPending: -1,
    memMaxStreamBytes: -1,
    diskMaxStreamBytes: -1,
    consumer: -1,
    maxLeafNodeConnections: -1,
    maxImports: -1,
    maxExports: -1,
    maxConnections: -1,
    maxData: -1,
    maxMsgPayload: -1,
    maxSubscriptions: -1,
    exportsAllowWildcards: true
  })
])

const USER_RULES = Object.freeze([
  Object.freeze({
    name: MICROSERVICE_USER_RULE_NAME,
    description: 'Default microservice user rule',
    bearerToken: false,
    allowedConnectionTypes: ['STANDARD', 'WEBSOCKET'],
    maxData: -1,
    maxSubscriptions: -1,
    maxPayload: -1
  }),
  Object.freeze({
    name: MQTT_BEARER_USER_RULE_NAME,
    description: 'Default MQTT bearer user rule',
    bearerToken: true,
    maxData: -1,
    maxSubscriptions: -1,
    maxPayload: -1,
    allowedConnectionTypes: ['MQTT', 'STANDARD']
  }),
  Object.freeze({
    name: DEFAULT_LEAF_USER_RULE_NAME,
    description: 'Default leaf node user rule for remote connection from leaf to server',
    bearerToken: false,
    maxData: -1,
    maxSubscriptions: -1,
    maxPayload: -1,
    allowedConnectionTypes: ['LEAFNODE', 'WEBSOCKET']
  }),
  Object.freeze({
    name: CONTROLLER_USER_RULE_NAME,
    description: 'Controller WebSocket relay user with standard app limits, scoped to controller.relay.v1.>',
    bearerToken: false,
    allowedConnectionTypes: ['STANDARD'],
    maxData: -1,
    maxSubscriptions: -1,
    maxPayload: -1,
    pubAllow: [CONTROLLER_NATS_RELAY_SUBJECT_ALLOW],
    subAllow: [CONTROLLER_NATS_RELAY_SUBJECT_ALLOW]
  })
])

const RESERVED_RULE_NAMES = new Set([
  ...ACCOUNT_RULES.map((rule) => rule.name),
  ...USER_RULES.map((rule) => rule.name)
])

function isReservedRuleName (name) {
  return RESERVED_RULE_NAMES.has(name)
}

function getSystemAccountRuleDefinitions () {
  return ACCOUNT_RULES.map((rule) => ({ ...rule }))
}

function getSystemUserRuleDefinitions () {
  return USER_RULES.map((rule) => ({ ...rule }))
}

function getSystemAccountRuleByName (name) {
  const rule = ACCOUNT_RULES.find((item) => item.name === name)
  return rule ? { ...rule } : null
}

function getSystemUserRuleByName (name) {
  const rule = USER_RULES.find((item) => item.name === name)
  return rule ? { ...rule } : null
}

module.exports = {
  SYSTEM_ACCOUNT_RULE_NAME,
  SYS_ACCOUNT_EXPORTS_INLINE,
  APPLICATION_ACCOUNT_RULE_NAME,
  MICROSERVICE_USER_RULE_NAME,
  MQTT_BEARER_USER_RULE_NAME,
  DEFAULT_LEAF_USER_RULE_NAME,
  CONTROLLER_ACCOUNT_RULE_NAME,
  CONTROLLER_USER_RULE_NAME,
  CONTROLLER_NATS_RELAY_SUBJECT_ALLOW,
  isReservedRuleName,
  getSystemAccountRuleDefinitions,
  getSystemUserRuleDefinitions,
  getSystemAccountRuleByName,
  getSystemUserRuleByName
}
