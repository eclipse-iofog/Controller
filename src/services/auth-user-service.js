'use strict'

const crypto = require('crypto')
const { Op } = require('sequelize')
const db = require('../data/models')
const Errors = require('../helpers/errors')
const { withTransaction } = require('../helpers/app-helper')
const TransactionDecorator = require('../decorators/transaction-decorator')
const { getAuthMode } = require('../config/oidc')
const AuthPolicyService = require('./auth-policy-service')
const AuthPasswordService = require('./auth-password-service')
const AuthTokenService = require('./auth-token-service')

const RESET_TOKEN_TTL_SECONDS = 3600

function ensureEmbeddedMode () {
  if (getAuthMode() !== 'embedded') {
    throw new Errors.NotImplementedError()
  }
}

function normalizeEmail (email) {
  return String(email || '').trim().toLowerCase()
}

function parsePasswordHistory (user) {
  if (!user.passwordHistoryHashes) {
    return []
  }
  try {
    return JSON.parse(user.passwordHistoryHashes)
  } catch (error) {
    return []
  }
}

function generateTemporaryPassword (policy) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  const minLength = Math.max(policy.minPasswordLength || 12, 12)

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)]
  ]

  while (chars.length < minLength) {
    chars.push(all[Math.floor(Math.random() * all.length)])
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }

  return chars.join('')
}

function formatUserResponse (user) {
  const groups = (user.groups || []).map((group) => group.name)
  return {
    id: user.id,
    email: user.email,
    groups,
    mustChangePassword: user.mustChangePassword,
    mfaEnabled: Boolean(user.mfa && user.mfa.enabled),
    isBootstrap: user.isBootstrap,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

async function loadUserById (userId, transaction, includeDeleted = false) {
  const where = { id: userId }
  if (!includeDeleted) {
    where.deletedAt = null
  }

  return db.AuthUser.findOne(withTransaction(transaction, {
    where,
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
}

async function resolveGroupIds (groupNames, transaction) {
  const normalizedNames = [...new Set((groupNames || []).map((name) => String(name).trim().toLowerCase()).filter(Boolean))]
  if (normalizedNames.length === 0) {
    return []
  }

  const groups = await db.AuthGroup.findAll(withTransaction(transaction, {
    where: {
      name: {
        [Op.in]: normalizedNames
      }
    }
  }))

  if (groups.length !== normalizedNames.length) {
    const found = new Set(groups.map((group) => group.name))
    const missing = normalizedNames.filter((name) => !found.has(name))
    throw new Errors.ValidationError(`Unknown groups: ${missing.join(', ')}`)
  }

  return groups.map((group) => group.id)
}

async function setUserGroups (user, groupIds, transaction) {
  await db.AuthUserGroup.destroy(withTransaction(transaction, {
    where: { userId: user.id }
  }))

  for (const groupId of groupIds) {
    await db.AuthUserGroup.create({
      userId: user.id,
      groupId
    }, withTransaction(transaction))
  }
}

async function updatePassword (user, newPassword, transaction) {
  const policy = await AuthPolicyService.getPolicy(transaction)
  AuthPasswordService.validatePasswordComplexity(newPassword, policy)

  const previousHashes = parsePasswordHistory(user)
  await AuthPasswordService.assertPasswordNotInHistory(newPassword, policy, previousHashes)

  const nextHistory = await AuthPasswordService.recordPasswordHistory(
    previousHashes,
    user.passwordHash,
    policy
  )

  await user.update({
    passwordHash: await AuthPasswordService.hashPassword(newPassword),
    passwordHistoryHashes: JSON.stringify(nextHistory),
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: null
  }, withTransaction(transaction))

  await AuthTokenService.revokeAllUserRefreshTokens(user.id, transaction)
}

async function listUsers (transaction) {
  const users = await db.AuthUser.findAll(withTransaction(transaction, {
    where: { deletedAt: null },
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
    ],
    order: [['email', 'ASC']]
  }))

  return users.map(formatUserResponse)
}

async function createUser ({ email, password, groups }, transaction) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) {
    throw new Errors.ValidationError('email and password are required')
  }

  const existing = await db.AuthUser.findOne(withTransaction(transaction, {
    where: { email: normalizedEmail }
  }))
  if (existing && !existing.deletedAt) {
    throw new Errors.ConflictError('A user with this email already exists')
  }

  const policy = await AuthPolicyService.getPolicy(transaction)
  AuthPasswordService.validatePasswordComplexity(password, policy)

  const groupIds = await resolveGroupIds(groups, transaction)
  const userId = crypto.randomUUID()
  const user = await db.AuthUser.create({
    id: userId,
    email: normalizedEmail,
    passwordHash: await AuthPasswordService.hashPassword(password),
    mustChangePassword: true,
    isBootstrap: false
  }, withTransaction(transaction))

  if (groupIds.length > 0) {
    await setUserGroups(user, groupIds, transaction)
  }

  return formatUserResponse(await loadUserById(user.id, transaction))
}

async function getUser (userId, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }
  return formatUserResponse(user)
}

async function updateUser (userId, payload, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }

  if (payload.email !== undefined) {
    const normalizedEmail = normalizeEmail(payload.email)
    if (!normalizedEmail) {
      throw new Errors.ValidationError('email is required')
    }
    const duplicate = await db.AuthUser.findOne(withTransaction(transaction, {
      where: {
        email: normalizedEmail,
        id: { [Op.ne]: user.id },
        deletedAt: null
      }
    }))
    if (duplicate) {
      throw new Errors.ConflictError('A user with this email already exists')
    }
    await user.update({ email: normalizedEmail }, withTransaction(transaction))
  }

  if (payload.groups !== undefined) {
    const groupIds = await resolveGroupIds(payload.groups, transaction)
    await setUserGroups(user, groupIds, transaction)
  }

  return formatUserResponse(await loadUserById(user.id, transaction))
}

async function deleteUser (userId, actorUserId, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }
  if (user.isBootstrap) {
    throw new Errors.ForbiddenError('Bootstrap admin user cannot be deleted')
  }
  if (actorUserId && actorUserId === user.id) {
    throw new Errors.ForbiddenError('Users cannot delete their own account')
  }

  await user.update({ deletedAt: new Date() }, withTransaction(transaction))
  await AuthTokenService.revokeAllUserRefreshTokens(user.id, transaction)
  return { status: 'success' }
}

async function resetPassword (userId, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }

  const policy = await AuthPolicyService.getPolicy(transaction)
  const temporaryPassword = generateTemporaryPassword(policy)
  AuthPasswordService.validatePasswordComplexity(temporaryPassword, policy)

  await user.update({
    passwordHash: await AuthPasswordService.hashPassword(temporaryPassword),
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: null
  }, withTransaction(transaction))
  await AuthTokenService.revokeAllUserRefreshTokens(user.id, transaction)

  return {
    temporaryPassword,
    mustChangePassword: true
  }
}

async function resetToken (userId, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }

  await db.AuthPasswordResetSession.destroy(withTransaction(transaction, {
    where: { userId: user.id }
  }))

  const resetTokenValue = crypto.randomUUID()
  await db.AuthPasswordResetSession.create({
    id: resetTokenValue,
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000)
  }, withTransaction(transaction))

  return {
    resetToken: resetTokenValue,
    expiresIn: RESET_TOKEN_TTL_SECONDS
  }
}

async function consumeResetToken (resetToken, transaction) {
  const session = await db.AuthPasswordResetSession.findByPk(resetToken, withTransaction(transaction))
  if (!session || session.expiresAt <= new Date()) {
    throw new Errors.InvalidCredentialsError('Invalid or expired reset token')
  }

  await session.destroy(withTransaction(transaction))
  return session.userId
}

async function changePasswordWithCurrent (userId, currentPassword, newPassword, transaction) {
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }

  if (!currentPassword || !newPassword) {
    throw new Errors.ValidationError('currentPassword and newPassword are required')
  }

  if (!await AuthPasswordService.verifyPassword(currentPassword, user.passwordHash)) {
    throw new Errors.InvalidCredentialsError()
  }

  await updatePassword(user, newPassword, transaction)
  return { status: 'success' }
}

async function changePassword (req, payload, transaction) {
  if (payload.resetToken) {
    const userId = await consumeResetToken(payload.resetToken, transaction)
    const user = await loadUserById(userId, transaction)
    if (!user) {
      throw new Errors.NotFoundError('User not found')
    }
    if (!payload.newPassword) {
      throw new Errors.ValidationError('newPassword is required')
    }
    await updatePassword(user, payload.newPassword, transaction)
    return { status: 'success' }
  }

  if (!req.headers.authorization) {
    throw new Errors.AuthenticationError('Authentication required')
  }

  const userId = req.kauth.grant.access_token.content.sub
  const user = await loadUserById(userId, transaction)
  if (!user) {
    throw new Errors.NotFoundError('User not found')
  }

  if (!payload.currentPassword || !payload.newPassword) {
    throw new Errors.ValidationError('currentPassword and newPassword are required')
  }

  if (!await AuthPasswordService.verifyPassword(payload.currentPassword, user.passwordHash)) {
    throw new Errors.InvalidCredentialsError()
  }

  await updatePassword(user, payload.newPassword, transaction)
  return { status: 'success' }
}

async function listGroups (transaction) {
  const groups = await db.AuthGroup.findAll(withTransaction(transaction, {
    order: [['name', 'ASC']]
  }))

  return groups.map(formatGroupResponse)
}

function normalizeGroupName (name) {
  const normalizedName = String(name || '').trim().toLowerCase()
  if (!normalizedName) {
    throw new Errors.ValidationError('name is required')
  }
  return normalizedName
}

async function findGroupByName (groupName, transaction) {
  const normalizedName = normalizeGroupName(groupName)
  return db.AuthGroup.findOne(withTransaction(transaction, {
    where: { name: normalizedName }
  }))
}

function formatGroupResponse (group) {
  return {
    id: group.id,
    name: group.name,
    isSystem: group.isSystem,
    mfaRequired: Boolean(group.mfaRequired),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt
  }
}

function parseMfaRequired (value) {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Errors.ValidationError('mfaRequired must be a boolean')
  }
  return value
}

async function createGroup ({ name, mfaRequired = false }, transaction) {
  const normalizedName = normalizeGroupName(name)
  if (SYSTEM_GROUP_NAMES.includes(normalizedName)) {
    throw new Errors.ConflictError('A system group with this name already exists')
  }

  const existing = await db.AuthGroup.findOne(withTransaction(transaction, {
    where: { name: normalizedName }
  }))
  if (existing) {
    throw new Errors.ConflictError('A group with this name already exists')
  }

  const parsedMfaRequired = parseMfaRequired(mfaRequired)
  const group = await db.AuthGroup.create({
    name: normalizedName,
    isSystem: false,
    mfaRequired: parsedMfaRequired === undefined ? false : parsedMfaRequired
  }, withTransaction(transaction))

  return formatGroupResponse(group)
}

async function getGroup (groupName, transaction) {
  const group = await findGroupByName(groupName, transaction)
  if (!group) {
    throw new Errors.NotFoundError('Group not found')
  }

  return formatGroupResponse(group)
}

async function updateGroup (groupName, payload, transaction) {
  const group = await findGroupByName(groupName, transaction)
  if (!group) {
    throw new Errors.NotFoundError('Group not found')
  }

  const hasName = payload.name !== undefined
  const hasMfaRequired = payload.mfaRequired !== undefined

  if (!hasName && !hasMfaRequired) {
    throw new Errors.ValidationError('At least one of name or mfaRequired is required')
  }

  if (group.isSystem) {
    if (hasName) {
      throw new Errors.ForbiddenError('System group names cannot be changed')
    }
    const mfaRequired = parseMfaRequired(payload.mfaRequired)
    await group.update({ mfaRequired }, withTransaction(transaction))
    return formatGroupResponse(group)
  }

  const updates = {}
  if (hasMfaRequired) {
    updates.mfaRequired = parseMfaRequired(payload.mfaRequired)
  }
  if (hasName) {
    const normalizedName = normalizeGroupName(payload.name)
    const duplicate = await db.AuthGroup.findOne(withTransaction(transaction, {
      where: {
        name: normalizedName,
        id: { [Op.ne]: group.id }
      }
    }))
    if (duplicate) {
      throw new Errors.ConflictError('A group with this name already exists')
    }
    updates.name = normalizedName
  }

  await group.update(updates, withTransaction(transaction))
  return getGroup(group.name, transaction)
}

async function deleteGroup (groupName, transaction) {
  const group = await findGroupByName(groupName, transaction)
  if (!group) {
    throw new Errors.NotFoundError('Group not found')
  }
  if (group.isSystem) {
    throw new Errors.ForbiddenError('System groups cannot be deleted')
  }

  await group.destroy(withTransaction(transaction))
  return { status: 'success' }
}

const SYSTEM_GROUP_NAMES = ['admin', 'sre', 'developer', 'viewer']

module.exports = {
  ensureEmbeddedMode,
  listUsers: TransactionDecorator.generateTransaction(listUsers),
  createUser: TransactionDecorator.generateTransaction(createUser),
  getUser: TransactionDecorator.generateTransaction(getUser),
  updateUser: TransactionDecorator.generateTransaction(updateUser),
  deleteUser: TransactionDecorator.generateTransaction(deleteUser),
  resetPassword: TransactionDecorator.generateTransaction(resetPassword),
  resetToken: TransactionDecorator.generateTransaction(resetToken),
  changePasswordWithCurrent: TransactionDecorator.generateTransaction(changePasswordWithCurrent),
  changePassword: TransactionDecorator.generateTransaction(changePassword),
  listGroups: TransactionDecorator.generateTransaction(listGroups),
  createGroup: TransactionDecorator.generateTransaction(createGroup),
  getGroup: TransactionDecorator.generateTransaction(getGroup),
  updateGroup: TransactionDecorator.generateTransaction(updateGroup),
  deleteGroup: TransactionDecorator.generateTransaction(deleteGroup)
}
