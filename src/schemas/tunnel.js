const tunnelCreate = {
  id: '/tunnelCreate',
  type: 'object',
  properties: {
    iofogUuid: { type: 'string' },
    username: { type: 'string', minLength: 1 },
    password: { type: 'string' },
    rsakey: { type: 'string' },
    lport: { type: 'integer', minimum: 0, maximum: 65535 },
    rport: { type: 'integer', minimum: 0, maximum: 65535 }
  },
  required: ['iofogUuid', 'username', 'password', 'lport', 'rport']
}

module.exports = {
  mainSchemas: [tunnelCreate]
}
