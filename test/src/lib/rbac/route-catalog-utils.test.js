const { expect } = require('chai')

const {
  isPublicCatalogRoute,
  resetRouteCatalogForTests
} = require('../../../../src/lib/rbac/route-catalog-utils')

describe('route-catalog-utils', () => {
  afterEach(() => {
    resetRouteCatalogForTests()
  })

  describe('isPublicCatalogRoute()', () => {
    it('returns true for public GET /api/v3/status', () => {
      expect(isPublicCatalogRoute('GET', '/api/v3/status')).to.equal(true)
    })

    it('returns true for public GET /api/v3/architectures/', () => {
      expect(isPublicCatalogRoute('GET', '/api/v3/architectures/')).to.equal(true)
    })

    it('returns false for protected GET /api/v3/services', () => {
      expect(isPublicCatalogRoute('GET', '/api/v3/services')).to.equal(false)
    })

    it('returns false for public path with unsupported method', () => {
      expect(isPublicCatalogRoute('POST', '/api/v3/status')).to.equal(false)
    })
  })
})
