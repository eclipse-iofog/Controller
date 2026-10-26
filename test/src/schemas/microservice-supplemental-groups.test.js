'use strict'

const { expect } = require('chai')

const Validator = require('../../../src/schemas')
const Errors = require('../../../src/helpers/errors')

describe('Microservice host group id schema', () => {
  const registerBody = {
    uuid: 'controller-ms',
    images: [{ containerImage: 'example/controller:1', archId: 1 }],
    registryId: 1
  }

  async function accept (schema, body) {
    const response = await Validator.validate(body, schema)
    expect(response.valid).to.equal(true)
  }

  async function reject (schema, body) {
    try {
      await Validator.validate(body, schema)
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.ValidationError)
      return
    }
    expect.fail(`expected validation to reject ${JSON.stringify(body.supplementalGroups)}`)
  }

  it('accepts the field on user create, system update, and controller register', async () => {
    await accept(Validator.schemas.microserviceCreate, {
      name: 'inference',
      supplementalGroups: [0, 4294967295]
    })
    await accept(Validator.schemas.microserviceUpdate, {
      supplementalGroups: JSON.parse('[44.0]')
    })
    await accept(Validator.schemas.controllerRegister, {
      ...registerBody,
      supplementalGroups: [44, 993],
      runAsGroup: 'render'
    })
  })

  it('rejects names, duplicates, fractions, and lists that are not host group ids', async () => {
    const rejected = [
      [44, 44],
      ['44'],
      ['render'],
      [44.5],
      [-1],
      Array.from({ length: 17 }, (_, index) => index),
      [4294967296],
      'render'
    ]
    for (const supplementalGroups of rejected) {
      await reject(Validator.schemas.microserviceCreate, { name: 'inference', supplementalGroups })
      await reject(Validator.schemas.microserviceUpdate, { supplementalGroups })
      await reject(Validator.schemas.controllerRegister, { ...registerBody, supplementalGroups })
    }
  })
})
