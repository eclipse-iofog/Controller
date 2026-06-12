'use strict'

const db = require('../data/models')
const Errors = require('../helpers/errors')
const { withTransaction } = require('../helpers/app-helper')
const { getAuthMode } = require('../config/oidc')
const embeddedOidc = require('../config/embedded-oidc')
const AuthPolicyService = require('./auth-policy-service')
const AuthPasswordService = require('./auth-password-service')
const AuthMfaService = require('./auth-mfa-service')
const AuthUserService = require('./auth-user-service')
const InteractionStateStore = require('./auth-interaction-state-store')

function ensureEmbeddedMode () {
  if (getAuthMode() !== 'embedded') {
    throw new Errors.NotImplementedError('OAuth interactions are only available in embedded auth mode')
  }
}

function getProvider () {
  const provider = embeddedOidc.getEmbeddedProvider()
  if (!provider) {
    throw new Error('Embedded OIDC provider is not initialized')
  }
  return provider
}

const {
  getInteractionState,
  setInteractionState,
  clearInteractionState,
  resetInteractionStateForTests
} = InteractionStateStore

async function findInteraction (uid) {
  const provider = getProvider()
  const interaction = await provider.Interaction.find(uid)
  if (!interaction) {
    throw new Errors.AuthenticationError('Interaction session not found or expired')
  }
  return interaction
}

async function finishInteraction (interaction, result) {
  interaction.result = result
  if (typeof interaction.exp !== 'number') {
    throw new Errors.AuthenticationError('Interaction session not found or expired')
  }
  const ttlSeconds = interaction.exp - Math.floor(Date.now() / 1000)
  await interaction.save(ttlSeconds)
  return interaction.returnTo
}

async function loadAuthContextByUserId (userId, transaction) {
  const user = await db.AuthUser.findOne(withTransaction(transaction, {
    where: {
      id: userId,
      deletedAt: null
    },
    include: [
      {
        model: db.AuthGroup,
        as: 'groups',
        through: { attributes: [] }
      },
      {
        model: db.AuthMfa,
        as: 'mfa'
      }
    ]
  }))

  if (!user) {
    return null
  }

  return {
    user,
    groups: user.groups || [],
    mfa: user.mfa || null,
    groupNames: (user.groups || []).map((group) => String(group.name).toLowerCase())
  }
}

function resolveNextStep (authContext, state) {
  if (!authContext || !state || !state.userId) {
    return 'login'
  }

  const { user, groups, mfa } = authContext

  if (AuthMfaService.userMustEnrollMfa(user, groups, mfa)) {
    if (!state.enrollmentConfirmed) {
      return state.enrollmentStarted ? 'confirm-enroll' : 'enroll'
    }
  }

  if (AuthMfaService.userRequiresMfaChallenge(user, groups, mfa)) {
    if (!state.mfaVerified) {
      return 'mfa'
    }
  }

  if (user.mustChangePassword && !state.passwordChanged) {
    return 'change-password'
  }

  return 'complete'
}

async function verifyLoginCredentials (credentials, transaction) {
  const authContext = await AuthMfaService.loadUserAuthContext(credentials.email, transaction)
  if (!authContext) {
    throw new Errors.InvalidCredentialsError()
  }

  const { user } = authContext
  const policy = await AuthPolicyService.getPolicy(transaction)

  if (AuthPolicyService.isAccountLocked(user, policy)) {
    throw new Errors.InvalidCredentialsError()
  }

  if (!await AuthPasswordService.verifyPassword(credentials.password, user.passwordHash)) {
    await AuthPolicyService.recordFailedLogin(user, policy, transaction)
    throw new Errors.InvalidCredentialsError()
  }

  return authContext
}

async function getStatus (uid, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    return { step: 'login' }
  }

  const authContext = await loadAuthContextByUserId(state.userId, transaction)
  if (!authContext) {
    await clearInteractionState(uid)
    throw new Errors.AuthenticationError('Interaction session not found or expired')
  }

  return { step: resolveNextStep(authContext, state) }
}

async function submitLogin (uid, credentials, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const authContext = await verifyLoginCredentials(credentials, transaction)
  const state = await setInteractionState(uid, {
    userId: authContext.user.id,
    mfaVerified: false,
    enrollmentStarted: false,
    enrollmentConfirmed: false,
    passwordChanged: false
  })

  return { step: resolveNextStep(authContext, state) }
}

async function submitMfa (uid, code, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    throw new Errors.InvalidCredentialsError()
  }

  await AuthMfaService.verifyMfaCode(state.userId, code, transaction)
  const nextState = await setInteractionState(uid, { mfaVerified: true })
  const authContext = await loadAuthContextByUserId(state.userId, transaction)

  return { step: resolveNextStep(authContext, nextState) }
}

async function submitEnroll (uid, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    throw new Errors.InvalidCredentialsError()
  }

  const enrollment = await AuthMfaService.enrollMfa(state.userId, transaction)
  const nextState = await setInteractionState(uid, { enrollmentStarted: true })

  return {
    step: resolveNextStep(await loadAuthContextByUserId(state.userId, transaction), nextState),
    secret: enrollment.secret,
    otpauthUrl: enrollment.otpauthUrl
  }
}

async function submitConfirmEnroll (uid, code, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    throw new Errors.InvalidCredentialsError()
  }

  const result = await AuthMfaService.confirmMfa(state.userId, code, transaction)
  const nextState = await setInteractionState(uid, {
    enrollmentConfirmed: true,
    mfaVerified: true
  })
  const authContext = await loadAuthContextByUserId(state.userId, transaction)

  return {
    step: resolveNextStep(authContext, nextState),
    recoveryCodes: result.recoveryCodes
  }
}

async function submitChangePassword (uid, credentials, transaction) {
  ensureEmbeddedMode()
  await findInteraction(uid)

  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    throw new Errors.InvalidCredentialsError()
  }

  const authContext = await loadAuthContextByUserId(state.userId, transaction)
  if (!authContext) {
    await clearInteractionState(uid)
    throw new Errors.AuthenticationError('Interaction session not found or expired')
  }

  const step = resolveNextStep(authContext, state)
  if (step !== 'change-password') {
    throw new Errors.ValidationError(`Interaction step "${step}" is required before password change`)
  }

  await AuthUserService.changePasswordWithCurrent(
    state.userId,
    credentials.currentPassword,
    credentials.newPassword,
    transaction
  )

  const nextState = await setInteractionState(uid, { passwordChanged: true })
  const updatedContext = await loadAuthContextByUserId(state.userId, transaction)

  return { step: resolveNextStep(updatedContext, nextState) }
}

async function buildConsentGrant (provider, interaction, accountId) {
  const grant = new provider.Grant({
    accountId,
    clientId: interaction.params.client_id
  })
  const scope = interaction.params.scope || 'openid profile email groups'
  grant.addOIDCScope(scope)
  const grantId = await grant.save()
  return grantId
}

async function complete (uid, req, res, transaction) {
  ensureEmbeddedMode()

  const interaction = await findInteraction(uid)
  const state = await getInteractionState(uid)
  if (!state || !state.userId) {
    throw new Errors.InvalidCredentialsError()
  }

  const authContext = await loadAuthContextByUserId(state.userId, transaction)
  if (!authContext) {
    await clearInteractionState(uid)
    throw new Errors.AuthenticationError('Interaction session not found or expired')
  }

  const step = resolveNextStep(authContext, state)
  if (step !== 'complete') {
    throw new Errors.ValidationError(`Interaction step "${step}" is required before completion`)
  }

  const provider = getProvider()
  const grantId = await buildConsentGrant(provider, interaction, state.userId)
  const redirectTo = await finishInteraction(interaction, {
    login: { accountId: state.userId },
    consent: { grantId }
  })

  await AuthPolicyService.resetFailedLogin(authContext.user, transaction)
  await clearInteractionState(uid)

  return { redirectTo, step: 'complete' }
}

module.exports = {
  getStatus,
  submitLogin,
  submitMfa,
  submitEnroll,
  submitConfirmEnroll,
  submitChangePassword,
  complete,
  resolveNextStep,
  resetInteractionStateForTests
}
