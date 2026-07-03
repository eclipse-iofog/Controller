'use strict'

const { expect } = require('chai')

const { isK8sNotFound, isK8sConflict } = require('../../../src/utils/k8s-client')

describe('k8s-client error helpers', () => {
  describe('.isK8sNotFound()', () => {
    it('detects ApiException-style 404 from client-node v1', () => {
      const error = {
        code: 404,
        message: 'Unknown API Status Code!',
        body: JSON.stringify({
          kind: 'Status',
          status: 'Failure',
          reason: 'NotFound',
          code: 404
        })
      }
      expect(isK8sNotFound(error)).to.equal(true)
    })

    it('detects axios-style 404', () => {
      expect(isK8sNotFound({ response: { status: 404 } })).to.equal(true)
    })

    it('detects parsed Status body', () => {
      expect(isK8sNotFound({
        body: { reason: 'NotFound', code: 404 }
      })).to.equal(true)
    })

    it('returns false for other errors', () => {
      expect(isK8sNotFound({ code: 500 })).to.equal(false)
      expect(isK8sNotFound(null)).to.equal(false)
    })
  })

  describe('.isK8sConflict()', () => {
    it('detects ApiException-style 409 from client-node v1', () => {
      const error = {
        code: 409,
        body: JSON.stringify({ reason: 'Conflict', code: 409 })
      }
      expect(isK8sConflict(error)).to.equal(true)
    })
  })
})
