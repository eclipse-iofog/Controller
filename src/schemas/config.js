const configUpdate = {
  id: '/configUpdate',
  type: 'object',
  properties: {
    port: { type: 'integer', minimum: 0, maximum: 65535 },
    sslCert: { type: 'string' },
    sslKey: { type: 'string' },
    intermediateCert: { type: 'string', optional: true },
    logDir: { type: 'string' },
    logSize: { type: 'integer' }
  }
}

const configElement = {
  id: '/configElement',
  type: 'object',
  properties: {
    key: { type: 'string', minLength: 1 },
    value: { type: 'string' }
  },
  required: ['key', 'value'],
  additionalProperties: true
}

module.exports = {
  mainSchemas: [configUpdate, configElement],
  innerSchemas: []
}
