const flowCreate = {
  'id': '/flowCreate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
  },
  'required': ['name'],
  'additionalProperties': true,
}

const flowUpdate = {
  'id': '/flowUpdate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
  },
  'additionalProperties': true,
}

module.exports = {
  mainSchemas: [flowCreate, flowUpdate],
  innerSchemas: [],
}
