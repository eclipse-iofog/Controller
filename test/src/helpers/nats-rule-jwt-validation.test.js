const { expect } = require('chai')

const Errors = require('../../../src/helpers/errors')
const {
  findNonLatin1Char,
  assertAccountRuleJwtEncodable,
  assertUserRuleJwtEncodable
} = require('../../../src/helpers/nats-rule-jwt-validation')

describe('NATS rule JWT validation helper', () => {
  describe('.findNonLatin1Char()', () => {
    it('returns null for ASCII text', () => {
      expect(findNonLatin1Char('production-monitoring')).to.eql(null)
    })

    it('detects em dash characters', () => {
      const found = findNonLatin1Char('path — stream')
      expect(found.char).to.eql('—')
      expect(found.codePoint).to.eql('U+2014')
    })
  })

  describe('.assertAccountRuleJwtEncodable()', () => {
    it('accepts ASCII account rules', () => {
      assertAccountRuleJwtEncodable({
        name: 'ok-rule',
        description: 'Production site account - export',
        exports: [{ name: 'live-alerts', subject: 'notify.>', type: 'service' }]
      })
    })

    it('rejects non-Latin-1 description', () => {
      expect(() => assertAccountRuleJwtEncodable({
        name: 'bad-rule',
        description: 'Production site account — export'
      })).to.throw(Errors.ValidationError, /field "description" contains non-Latin-1 character U\+2014/)
    })

    it('rejects non-Latin-1 export descriptions from persisted JSON', () => {
      expect(() => assertAccountRuleJwtEncodable({
        name: 'bad-rule',
        exports: JSON.stringify([{
          name: 'event-journal',
          subject: 'journal.events.>',
          type: 'stream',
          description: 'JetStream journal replay path — stream'
        }])
      })).to.throw(Errors.ValidationError, /exports\[0\]\.description/)
    })

    it('validates only defined fields on partial updates', () => {
      assertAccountRuleJwtEncodable({ description: 'ASCII only' }, { ruleName: 'partial-rule', partial: true })
      expect(() => assertAccountRuleJwtEncodable({
        description: 'Still — bad'
      }, { ruleName: 'partial-rule', partial: true })).to.throw(Errors.ValidationError)
    })
  })

  describe('.assertUserRuleJwtEncodable()', () => {
    it('accepts ASCII user rules', () => {
      assertUserRuleJwtEncodable({
        name: 'sensor-publisher',
        pubAllow: JSON.stringify(['telemetry.temperature'])
      })
    })

    it('rejects non-Latin-1 tag values', () => {
      expect(() => assertUserRuleJwtEncodable({
        name: 'bad-user-rule',
        tags: ['ok', 'bad—tag']
      })).to.throw(Errors.ValidationError, /tags\[1\]/)
    })
  })
})
