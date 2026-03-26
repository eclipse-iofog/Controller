/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const { nameRegex } = require('./utils/utils')

// Inner Schema: RBAC Rule
const rbacRule = {
  id: '/rbacRule',
  type: 'object',
  required: ['apiGroups', 'resources', 'verbs'],
  properties: {
    apiGroups: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    resources: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    verbs: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['get', 'list', 'create', 'update', 'patch', 'delete', '*']
      },
      minItems: 1
    },
    resourceNames: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  additionalProperties: false
}

// Inner Schema: Role Reference
const roleRef = {
  id: '/roleRef',
  type: 'object',
  required: ['kind', 'name'],
  properties: {
    kind: {
      type: 'string',
      enum: ['Role']
    },
    name: {
      type: 'string',
      minLength: 1
    },
    apiGroup: {
      type: 'string'
    }
  },
  additionalProperties: false
}

// Inner Schema: Subject
const subject = {
  id: '/subject',
  type: 'object',
  required: ['kind', 'name'],
  properties: {
    kind: {
      type: 'string',
      enum: ['User', 'Group', 'ServiceAccount']
    },
    name: {
      type: 'string',
      minLength: 1
    },
    apiGroup: {
      type: 'string'
    }
  },
  additionalProperties: false
}

// Main Schema: Role Create
const roleCreate = {
  id: '/roleCreate',
  type: 'object',
  required: ['name', 'rules'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    kind: {
      type: 'string',
      enum: ['Role']
    },
    rules: {
      type: 'array',
      minItems: 1,
      items: { $ref: '/rbacRule' }
    }
  },
  additionalProperties: false
}

// Main Schema: Role Update
const roleUpdate = {
  id: '/roleUpdate',
  type: 'object',
  required: ['rules'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    kind: {
      type: 'string',
      enum: ['Role']
    },
    rules: {
      type: 'array',
      minItems: 1,
      items: { $ref: '/rbacRule' }
    }
  },
  additionalProperties: false
}

// Main Schema: RoleBinding Create
const roleBindingCreate = {
  id: '/roleBindingCreate',
  type: 'object',
  required: ['name', 'roleRef', 'subjects'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    kind: {
      type: 'string',
      enum: ['RoleBinding']
    },
    roleRef: {
      $ref: '/roleRef'
    },
    subjects: {
      type: 'array',
      minItems: 1,
      items: { $ref: '/subject' }
    }
  },
  additionalProperties: false
}

// Main Schema: RoleBinding Update
const roleBindingUpdate = {
  id: '/roleBindingUpdate',
  type: 'object',
  required: ['roleRef', 'subjects'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    kind: {
      type: 'string',
      enum: ['RoleBinding']
    },
    roleRef: {
      $ref: '/roleRef'
    },
    subjects: {
      type: 'array',
      minItems: 1,
      items: { $ref: '/subject' }
    }
  },
  additionalProperties: false
}

// Main Schema: ServiceAccount Create
const serviceAccountCreate = {
  id: '/serviceAccountCreate',
  type: 'object',
  required: ['name', 'applicationName', 'roleRef'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    applicationName: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    roleRef: {
      $ref: '/roleRef'
    }
  },
  additionalProperties: false
}

// Main Schema: ServiceAccount Update
const serviceAccountUpdate = {
  id: '/serviceAccountUpdate',
  type: 'object',
  required: ['name', 'roleRef'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: nameRegex
    },
    roleRef: {
      $ref: '/roleRef'
    }
  },
  additionalProperties: false
}

module.exports = {
  mainSchemas: [
    roleCreate,
    roleUpdate,
    roleBindingCreate,
    roleBindingUpdate,
    serviceAccountCreate,
    serviceAccountUpdate
  ],
  innerSchemas: [
    rbacRule,
    roleRef,
    subject
  ]
}
