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
const axios = require('axios')
const qs = require('qs')
const https = require('https')
const config = require('../config')

const kcClient = process.env.KC_CLIENT || config.get('auth.client.id')
const kcClientSecret = process.env.KC_CLIENT_SECRET || config.get('auth.client.secret')
const kcUrl = process.env.KC_URL || config.get('auth.url')
const kcRealm = process.env.KC_REALM || config.get('auth.realm')
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

const isAuthConfigured = () => {
  return kcUrl && kcRealm && kcClient && kcClientSecret
}

const login = async function (credentials, isCLI, transaction) {
  // If in dev mode and auth is not configured, always return mock token
  if (!isAuthConfigured() && isDevMode) {
    return {
      accessToken: mockToken.access_token,
      refreshToken: mockToken.refresh_token
    }
  }

  // If auth is not configured and not in dev mode, throw error
  if (!isAuthConfigured() && !isDevMode) {
    throw new Error(`Auth is not configured for this cluster. Please contact your administrator.`)
  }

  // Only proceed with axios request if auth is configured
  const data = qs.stringify({
    grant_type: 'password',
    username: credentials.email,
    password: credentials.password,
    totp: credentials.totp,
    client_id: kcClient,
    client_secret: kcClientSecret
  })

  const agent = new https.Agent({
    rejectUnauthorized: false
  })

  const requestConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${kcUrl}realms/${kcRealm}/protocol/openid-connect/token`,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data,
    httpsAgent: agent
  }

  try {
    const response = await axios.request(requestConfig)
    const accessToken = response.data.access_token
    const refreshToken = response.data.refresh_token
    return {
      accessToken,
      refreshToken
    }
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Errors.InvalidCredentialsError(error.response.data.error_description || 'Invalid credentials')
    }
    throw new Errors.InvalidCredentialsError(error.message || 'Invalid credentials')
  }
}

const refresh = async function (credentials, isCLI, transaction) {
  // If in dev mode and auth is not configured, always return mock token
  if (!isAuthConfigured() && isDevMode) {
    return {
      accessToken: mockToken.access_token,
      refreshToken: mockToken.refresh_token
    }
  }

  // If auth is not configured and not in dev mode, throw error
  if (!isAuthConfigured() && !isDevMode) {
    throw new Error(`Auth is not configured for this cluster. Please contact your administrator.`)
  }

  // Only proceed with axios request if auth is configured
  const data = qs.stringify({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: kcClient,
    client_secret: kcClientSecret
  })

  const agent = new https.Agent({
    rejectUnauthorized: false
  })

  const requestConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${kcUrl}realms/${kcRealm}/protocol/openid-connect/token`,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data,
    httpsAgent: agent
  }

  try {
    const response = await axios.request(requestConfig)
    const accessToken = response.data.access_token
    const refreshToken = response.data.refresh_token
    return {
      accessToken,
      refreshToken
    }
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Errors.InvalidCredentialsError(error.response.data.error_description || 'Invalid credentials')
    }
    throw new Errors.InvalidCredentialsError(error.message || 'Invalid credentials')
  }
}

const profile = async function (req, isCLI, transaction) {
  // If in dev mode and auth is not configured, always return mock user
  if (!isAuthConfigured() && isDevMode) {
    return mockUser
  }

  // If auth is not configured and not in dev mode, throw error
  if (!isAuthConfigured() && !isDevMode) {
    throw new Error(`Auth is not configured for this cluster. Please contact your administrator.`)
  }

  // Only proceed with axios request if auth is configured
  const accessToken = req.headers.authorization.replace('Bearer ', '')
  const agent = new https.Agent({
    rejectUnauthorized: false
  })

  const requestConfig = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${kcUrl}realms/${kcRealm}/protocol/openid-connect/userinfo`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${accessToken}`
    },
    httpsAgent: agent
  }

  try {
    const response = await axios.request(requestConfig)
    return response.data
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Errors.InvalidCredentialsError(error.response.data.error_description || 'Invalid credentials')
    }
    throw new Errors.InvalidCredentialsError(error.message || 'Invalid credentials')
  }
}

const logout = async function (req, isCLI, transaction) {
  // If in dev mode and auth is not configured, always return success
  if (!isAuthConfigured() && isDevMode) {
    return { status: 'success' }
  }

  // If auth is not configured and not in dev mode, throw error
  if (!isAuthConfigured() && !isDevMode) {
    throw new Error(`Auth is not configured for this cluster. Please contact your administrator.`)
  }

  // Only proceed with axios request if auth is configured
  const accessToken = req.headers.authorization.replace('Bearer ', '')
  const agent = new https.Agent({
    rejectUnauthorized: false
  })

  const requestConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${kcUrl}realms/${kcRealm}/protocol/openid-connect/logout`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${accessToken}`
    },
    httpsAgent: agent
  }

  try {
    const response = await axios.request(requestConfig)
    return response.data
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Errors.InvalidCredentialsError(error.response.data.error_description || 'Invalid credentials')
    }
    throw new Errors.InvalidCredentialsError(error.message || 'Invalid credentials')
  }
}

module.exports = {
  login: TransactionDecorator.generateTransaction(login),
  refresh: TransactionDecorator.generateTransaction(refresh),
  profile: TransactionDecorator.generateTransaction(profile),
  logout: TransactionDecorator.generateTransaction(logout)
}
