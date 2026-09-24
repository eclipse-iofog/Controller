const { serviceNameRegex } = require('./utils/utils')

const modelFormats = ['gguf', 'safetensors', 'onnx', 'pytorch', 'tensorrt', 'unknown']

const modelCreate = {
  id: '/modelCreate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    },
    repo: {
      type: 'string',
      minLength: 1
    },
    revision: {
      type: 'string'
    },
    registryId: {
      type: 'integer',
      minimum: 1
    },
    files: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    format: {
      type: 'string',
      enum: modelFormats
    }
  },
  required: ['name', 'repo', 'registryId'],
  additionalProperties: false
}

const modelUpdate = {
  id: '/modelUpdate',
  type: 'object',
  properties: {
    repo: {
      type: 'string',
      minLength: 1
    },
    revision: {
      type: 'string'
    },
    registryId: {
      type: 'integer',
      minimum: 1
    },
    files: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    format: {
      type: 'string',
      enum: modelFormats
    }
  },
  additionalProperties: false
}

const modelLink = {
  id: '/modelLink',
  type: 'object',
  properties: {
    fogUuids: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    }
  },
  required: ['fogUuids'],
  additionalProperties: false
}

const modelUnlink = {
  id: '/modelUnlink',
  type: 'object',
  properties: {
    fogUuids: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    }
  },
  required: ['fogUuids'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [modelCreate, modelUpdate, modelLink, modelUnlink],
  innerSchemas: [modelCreate, modelUpdate]
}
