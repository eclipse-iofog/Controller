/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * Hardcoded system roles configuration
 * Admin role is fixed and cannot be modified, created, or deleted
 * Note: Namespace is set from controller config at runtime, 'datasance' is default
 */
const config = require('./index')

function getNamespace () {
  return process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'iofog')
}

module.exports = {
  ADMIN_ROLE: {
    name: 'admin',
    apiVersion: 'iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['*'],
        verbs: ['*']
      }
    ]
  },
  SRE_ROLE: {
    name: 'sre',
    apiVersion: 'iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'systemMicroservices', 'fogs', 'applications', 'systemApplications', 'applicationTemplates', 'services', 'router', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'flows', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'tunnels', 'certificates', 'edgeResources', 'capabilities', 'diagnostics', 'serviceAccounts', 'events', 'users', 'config', 'controller', 'execSessions', 'systemExecSessions', 'logs', 'systemLogs'],
        verbs: ['*']
      },
      {
        apiGroups: [''],
        resources: ['roles', 'roleBindings', 'natsOperator', 'natsHub'],
        verbs: ['get', 'list']
      }
    ]
  },
  DEVELOPER_ROLE: {
    name: 'developer',
    apiVersion: 'iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'applications', 'applicationTemplates', 'services', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'flows', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'certificates', 'edgeResources', 'capabilities', 'diagnostics', 'serviceAccounts', 'controller', 'execSessions', 'logs'],
        verbs: ['get', 'list', 'create', 'update', 'patch', 'delete']
      },
      {
        apiGroups: [''],
        resources: ['fogs', 'router', 'tunnels', 'users', 'config', 'roles', 'roleBindings', 'systemMicroservices', 'systemApplications', 'natsOperator', 'natsHub'],
        verbs: ['get', 'list']
      }
    ]
  },
  VIEWER_ROLE: {
    name: 'viewer',
    apiVersion: 'iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'fogs', 'applications', 'systemMicroservices', 'systemApplications', 'applicationTemplates', 'services', 'router', 'natsOperator', 'natsHub', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'flows', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'certificates', 'edgeResources', 'capabilities', 'diagnostics', 'serviceAccounts', 'config', 'controller', 'roles', 'roleBindings'],
        verbs: ['get', 'list']
      }
    ]
  },
  AGENT_ADMIN_ROLE: {
    name: 'agent-admin',
    apiVersion: 'agent.iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        // Wildcard covers all agent API resources and verbs
        // This includes all Microservice role permissions plus:
        // - status (get)
        // - info (get)
        // - version (get)
        // - provision (post)
        // - deprovision (delete)
        // - config (post)
        // - prune (post)
        apiGroups: ['agent.iofog.org/v3'],
        resources: ['*'],
        verbs: ['*']
      }
    ]
  },
  MICROSERVICE_ROLE: {
    name: 'microservice',
    apiVersion: 'agent.iofog.org/v3',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: ['agent.iofog.org/v3'],
        resources: ['gps'],
        verbs: ['get', 'patch']
      },
      {
        apiGroups: ['agent.iofog.org/v3'],
        resources: ['config'],
        verbs: ['get']
      },
      {
        apiGroups: ['agent.iofog.org/v3'],
        resources: ['log'],
        verbs: ['post']
      },
      {
        apiGroups: ['agent.iofog.org/v3'],
        resources: ['control'],
        verbs: ['get']
        // Note: WebSocket 'get' for control is handled separately by agent
      }
    ]
  }
}
