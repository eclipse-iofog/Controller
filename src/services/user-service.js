/*
 * *******************************************************************************
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

const Errors = require('../helpers/errors')
const TransactionDecorator = require('../decorators/transaction-decorator')
const config = require('../config')
const {
  genericGrantRequest,
  refreshTokenGrant,
  fetchUserInfo,
  tokenRevocation
} = require('openid-client')
const { decodeJwt } = require('jose')
const { getOidcConfiguration, isAuthConfigured } = require('../config/oidc')

const isDevMode = config.get('server.devMode', true)

const mockUser = {
  preferred_username: 'dev-user',
  email: 'dev@example.com',
  realm_access: {
    roles: ['SRE', 'Developer', 'Viewer']
  }
}

const mockToken = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token'
}

function mapOidcError (error) {
  const description = error.error_description || error.message || 'Invalid credentials'
  throw new Errors.InvalidCredentialsError(description)
}

function tokensFromResponse (tokenResponse) {
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token
  }
}

function ensureAuthOrDev () {
  if (!isAuthConfigured() && isDevMode) {
    return 'dev'
  }

  if (!isAuthConfigured() && !isDevMode) {
    throw new Error('Auth is not configured for this cluster. Please contact your administrator.')
  }

  return 'oidc'
}

const login = async function (credentials, isCLI, transaction) {
  const mode = ensureAuthOrDev()
  if (mode === 'dev') {
    return {
      accessToken: mockToken.access_token,
      refreshToken: mockToken.refresh_token
    }
  }

  try {
    const oidcConfig = await getOidcConfiguration()
    const parameters = {
      username: credentials.email,
      password: credentials.password
    }
    if (credentials.totp) {
      parameters.totp = credentials.totp
    }

    const tokenResponse = await genericGrantRequest(oidcConfig, 'password', parameters)
    return tokensFromResponse(tokenResponse)
  } catch (error) {
    mapOidcError(error)
  }
}

const refresh = async function (credentials, isCLI, transaction) {
  const mode = ensureAuthOrDev()
  if (mode === 'dev') {
    return {
      accessToken: mockToken.access_token,
      refreshToken: mockToken.refresh_token
    }
  }

  try {
    const oidcConfig = await getOidcConfiguration()
    const tokenResponse = await refreshTokenGrant(oidcConfig, credentials.refreshToken)
    return tokensFromResponse(tokenResponse)
  } catch (error) {
    mapOidcError(error)
  }
}

const profile = async function (req, isCLI, transaction) {
  const mode = ensureAuthOrDev()
  if (mode === 'dev') {
    return mockUser
  }

  const accessToken = req.headers.authorization.replace('Bearer ', '')

  try {
    const oidcConfig = await getOidcConfiguration()
    const claims = decodeJwt(accessToken)
    const subject = claims.sub
    if (!subject) {
      throw new Errors.InvalidCredentialsError('Invalid credentials')
    }

    return await fetchUserInfo(oidcConfig, accessToken, subject)
  } catch (error) {
    if (error instanceof Errors.InvalidCredentialsError) {
      throw error
    }
    mapOidcError(error)
  }
}

const logout = async function (req, isCLI, transaction) {
  const mode = ensureAuthOrDev()
  if (mode === 'dev') {
    return { status: 'success' }
  }

  const accessToken = req.headers.authorization.replace('Bearer ', '')

  try {
    const oidcConfig = await getOidcConfiguration()
    const metadata = oidcConfig.serverMetadata()
    if (metadata.revocation_endpoint) {
      await tokenRevocation(oidcConfig, accessToken, { token_type_hint: 'access_token' })
    }
  } catch (error) {
    // Best-effort logout when issuer has no revocation endpoint or revocation fails
  }

  return { status: 'success' }
}

module.exports = {
  login: TransactionDecorator.generateTransaction(login),
  refresh: TransactionDecorator.generateTransaction(refresh),
  profile: TransactionDecorator.generateTransaction(profile),
  logout: TransactionDecorator.generateTransaction(logout)
}
