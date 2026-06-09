/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const Validator = require('jsonschema').Validator
const fs = require('fs')
const path = require('path')

const basename = path.basename(__filename)

const Errors = require('../helpers/errors')

const v = new Validator()
const schemas = {}

const registerSchema = (schema, schemaName) => {
  v.addSchema(schema, schemaName)
}

fs.readdirSync(__dirname)
  .filter((file) => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
  })
  .forEach((file) => {
    const allSchemas = require(path.join(__dirname, file))

    const mainSchemas = allSchemas.mainSchemas
    const innerSchemas = allSchemas.innerSchemas

    mainSchemas.forEach((schema) => {
      schemas[schema.id.replace('/', '')] = schema
    })
    if (innerSchemas) {
      innerSchemas.forEach((schema) => {
        registerSchema(schema, schema.id)
      })
    }
  })

async function validate (object, schema) {
  const response = v.validate(object, schema)
  if (!response.valid) {
    await handleValidationError(response.errors[0])
  }
  return response
}

async function handleValidationError (error) {
  let message
  switch (error.name) {
    case 'pattern':
      message = 'Invalid format for field \'' + error.property.replace('instance.', '') + '\''
      break
    case 'required':
      message = 'Required field \'' + error.argument + '\' is missing'
      break
    case 'minLength':
    case 'maxLength':
      message = 'Field ' + error.stack.replace('instance.', '')
      break
    case 'additionalProperties':
      message = 'Field \'' + error.argument + '\' not allowed'
      break
    case 'type':
      message = 'Field \'' + error.property.replace('instance.', '') + '\' ' + error.message
      break
    case 'enum':
      message = 'Field ' + error.stack.replace('instance.', '')
      break
    case 'minimum':
      message = error.stack.replace('instance.', '')
      break
    default:
      message = JSON.stringify(error)
      break
  }

  throw new Errors.ValidationError(message)
}

module.exports = {
  validate,
  schemas
}
