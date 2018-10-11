const Validator = require('jsonschema').Validator;
const fs = require('fs');
const path = require('path');

const basename = path.basename(__filename);

const Errors = require('../helpers/errors');

const v = new Validator();
const schemas = {};

const registerSchema = (schema, schemaName) => {
  v.addSchema(schema, schemaName);
};

fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const allSchemas = require(path.join(__dirname, file));

    const mainSchemas = allSchemas.mainSchemas;
    const innerSchemas = allSchemas.innerSchemas;

    mainSchemas.forEach(schema => {
      schemas[schema.id.replace('/', '')] = schema;
    });

    innerSchemas.forEach(schema => {
      registerSchema(schema, schema.id);
    });
  });


async function validate(object, schema) {
  const response = v.validate(object, schema);
  if (!response.valid) {
    throw new Errors.ValidationError(response.errors[0].stack)
  }
  return response
}

module.exports = {
  validate,
  schemas
};