'use strict'

const { Op } = require('sequelize')
const { isSharedSessionStore, getSessionStoreTtlMs } = require('../config/auth-session-store')

const interactionStateByUid = new Map()

function getTtlMs () {
  return getSessionStoreTtlMs()
}

function usesDatabaseStore () {
  return isSharedSessionStore()
}

function getInteractionStateModel () {
  const db = require('../data/models')
  if (!db.AuthInteractionState) {
    throw new Error('Database interaction state store requires AuthInteractionState model')
  }
  return db.AuthInteractionState
}

async function pruneExpiredInteractionState () {
  const now = Date.now()
  const ttlMs = getTtlMs()

  if (usesDatabaseStore()) {
    const AuthInteractionState = getInteractionStateModel()
    await AuthInteractionState.destroy({
      where: {
        expiresAt: {
          [Op.lte]: new Date()
        }
      }
    })
    return
  }

  for (const [uid, state] of interactionStateByUid.entries()) {
    if (!state.updatedAt || now - state.updatedAt > ttlMs) {
      interactionStateByUid.delete(uid)
    }
  }
}

async function getInteractionState (uid) {
  await pruneExpiredInteractionState()

  if (usesDatabaseStore()) {
    const AuthInteractionState = getInteractionStateModel()
    const row = await AuthInteractionState.findByPk(uid)
    if (!row || row.expiresAt <= new Date()) {
      return null
    }
    return JSON.parse(row.payload)
  }

  return interactionStateByUid.get(uid) || null
}

async function setInteractionState (uid, patch) {
  const existing = (await getInteractionState(uid)) || { updatedAt: Date.now() }
  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now()
  }

  if (usesDatabaseStore()) {
    const AuthInteractionState = getInteractionStateModel()
    const expiresAt = new Date(Date.now() + getTtlMs())
    await AuthInteractionState.upsert({
      uid,
      payload: JSON.stringify(next),
      expiresAt
    })
    return next
  }

  interactionStateByUid.set(uid, next)
  return next
}

async function clearInteractionState (uid) {
  if (usesDatabaseStore()) {
    const AuthInteractionState = getInteractionStateModel()
    await AuthInteractionState.destroy({ where: { uid } })
    return
  }

  interactionStateByUid.delete(uid)
}

function resetInteractionStateForTests () {
  interactionStateByUid.clear()
}

module.exports = {
  getInteractionState,
  setInteractionState,
  clearInteractionState,
  resetInteractionStateForTests,
  usesDatabaseStore
}
