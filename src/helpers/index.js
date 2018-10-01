var crypto = require('crypto')

const ALGORITHM = 'aes-256-ctr'

function encryptText(text, salt) {
  const cipher = crypto.createCipher(ALGORITHM, salt)
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex')
  return crypted
}

function decryptText(text, salt) {
  var decipher = crypto.createDecipher(ALGORITHM, salt)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

module.exports = {
  encryptText,
  decryptText,
}