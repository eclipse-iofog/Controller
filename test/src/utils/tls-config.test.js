const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const sinon = require('sinon')

const config = require('../../../src/config')
const {
  getListenerTlsMaterial,
  getListenerTrustCaBuffers,
  getListenerTrustCaBase64,
  isSelfSignedCertBuffer
} = require('../../../src/utils/tls-config')

describe('tls-config', () => {
  def('sandbox', () => sinon.createSandbox())
  def('certDir', () => path.join(__dirname, '../../tls-cert'))

  afterEach(() => {
    $sandbox.restore()
    delete process.env.TLS_PATH_KEY
    delete process.env.TLS_PATH_CERT
    delete process.env.TLS_PATH_INTERMEDIATE_CERT
    delete process.env.TLS_BASE64_KEY
    delete process.env.TLS_BASE64_CERT
    delete process.env.TLS_BASE64_INTERMEDIATE_CERT
  })

  it('returns disabled material in dev mode', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'server.devMode') {
        return true
      }
      return defaultValue
    })

    expect(getListenerTlsMaterial()).to.deep.equal({ enabled: false })
  })

  it('loads file-based listener TLS material in production mode', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'server.devMode') {
        return false
      }
      return defaultValue
    })

    process.env.TLS_PATH_KEY = path.join($certDir, 'tls.key')
    process.env.TLS_PATH_CERT = path.join($certDir, 'tls.crt')
    process.env.TLS_PATH_INTERMEDIATE_CERT = path.join($certDir, 'ca.crt')

    expect(getListenerTlsMaterial()).to.include({
      enabled: true,
      isBase64: false
    })
  })

  it('loads base64 listener TLS material in production mode', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'server.devMode') {
        return false
      }
      return defaultValue
    })

    const toBase64 = (fileName) => fs.readFileSync(path.join($certDir, fileName)).toString('base64')
    process.env.TLS_BASE64_KEY = toBase64('tls.key')
    process.env.TLS_BASE64_CERT = toBase64('tls.crt')
    process.env.TLS_BASE64_INTERMEDIATE_CERT = toBase64('ca.crt')

    expect(getListenerTlsMaterial()).to.include({
      enabled: true,
      isBase64: true
    })
  })

  it('derives trust CA buffers from intermediate cert path', () => {
    const material = {
      enabled: true,
      cert: path.join($certDir, 'tls.crt'),
      intermediateCert: path.join($certDir, 'ca.crt'),
      isBase64: false
    }

    const caBuffers = getListenerTrustCaBuffers(material)
    expect(caBuffers).to.have.length(1)
    expect(isSelfSignedCertBuffer(caBuffers[0])).to.equal(true)
  })

  it('falls back to self-signed leaf cert when intermediate is absent', () => {
    const material = {
      enabled: true,
      cert: path.join($certDir, 'tls.crt'),
      intermediateCert: undefined,
      isBase64: false
    }

    const caBuffers = getListenerTrustCaBuffers(material)
    expect(caBuffers).to.have.length(1)
  })

  it('returns base64-encoded CA from file-based intermediate cert', () => {
    const expected = fs.readFileSync(path.join($certDir, 'ca.crt')).toString('base64')
    const material = {
      enabled: true,
      cert: path.join($certDir, 'tls.crt'),
      intermediateCert: path.join($certDir, 'ca.crt'),
      isBase64: false
    }

    expect(getListenerTrustCaBase64(material)).to.equal(expected)
  })

  it('returns base64-encoded CA from base64 intermediate cert config', () => {
    const expected = fs.readFileSync(path.join($certDir, 'ca.crt')).toString('base64')
    const material = {
      enabled: true,
      cert: fs.readFileSync(path.join($certDir, 'tls.crt')).toString('base64'),
      intermediateCert: expected,
      isBase64: true
    }

    expect(getListenerTrustCaBase64(material)).to.equal(expected)
  })

  it('returns empty string when no trust CA can be derived', () => {
    expect(getListenerTrustCaBase64({ enabled: false })).to.equal('')
  })
})
