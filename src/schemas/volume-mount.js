const { serviceNameRegex } = require('./utils/utils')

const volumeMountCreate = {
  'id': '/volumeMountCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': serviceNameRegex
    },
    'secretName': {
      'type': 'string'
    },
    'configMapName': {
      'type': 'string'
    }
  },
  'required': ['name'],
  'oneOf': [
    {
      'required': ['secretName']
    },
    {
      'required': ['configMapName']
    }
  ],
  'additionalProperties': false
}

const volumeMountUpdate = {
  'id': '/volumeMountUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': serviceNameRegex
    },
    'secretName': {
      'type': 'string'
    },
    'configMapName': {
      'type': 'string'
    }
  },
  'oneOf': [
    {
      'required': ['secretName']
    },
    {
      'required': ['configMapName']
    }
  ],
  'additionalProperties': false
}

const volumeMountLink = {
  'id': '/volumeMountLink',
  'type': 'object',
  'properties': {
    'fogUuids': {
      'type': 'array',
      'items': {
        'type': 'string'
      },
      'minItems': 1
    }
  },
  'required': ['fogUuids'],
  'additionalProperties': false
}

const volumeMountUnlink = {
  'id': '/volumeMountUnlink',
  'type': 'object',
  'properties': {
    'fogUuids': {
      'type': 'array',
      'items': {
        'type': 'string'
      },
      'minItems': 1
    }
  },
  'required': ['fogUuids'],
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [volumeMountCreate, volumeMountUpdate, volumeMountLink, volumeMountUnlink],
  innerSchemas: [volumeMountCreate, volumeMountUpdate]
}
