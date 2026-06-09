/* eslint-disable no-useless-escape */
module.exports = {
  nameRegex: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$',
  serviceNameRegex: '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$',
  // Supports hex, rgb, and rgba
  colorRegex: '^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}))|(rgb\(\s*(?:(\d{1,3})\s*,?){3}\))|(rgba\(\s*(?:(\d{1,3})\s*,?){4}\))|$',
  // https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
  // https://regex101.com/r/vkijKf/380
  versionRegex: '^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:[+]([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$'
}
