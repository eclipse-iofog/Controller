/**
 * Hardcoded system roles configuration
 * Admin role is fixed and cannot be modified, created, or deleted
 * Note: Namespace is set from controller config at runtime, 'iofog' is default
 */
const config = require('./index')
const { getRbacApiVersion } = require('./flavor')

function getNamespace () {
  return process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'iofog')
}

module.exports = {
  ADMIN_ROLE: {
    name: 'admin',
    get apiVersion () {
      return getRbacApiVersion()
    },
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
    get apiVersion () {
      return getRbacApiVersion()
    },
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'systemMicroservices', 'fogs', 'applications', 'systemApplications', 'applicationTemplates', 'services', 'router', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'tunnels', 'certificates', 'capabilities', 'cluster', 'serviceAccounts', 'events', 'users', 'authUsers', 'authGroups', 'config', 'controller', 'execSessions', 'systemExecSessions', 'logs', 'systemLogs'],
        verbs: ['*']
      },
      {
        apiGroups: [''],
        resources: ['roles', 'roleBindings', 'natsOperator', 'natsBootstrap', 'natsHub'],
        verbs: ['get', 'list']
      }
    ]
  },
  DEVELOPER_ROLE: {
    name: 'developer',
    get apiVersion () {
      return getRbacApiVersion()
    },
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'applications', 'applicationTemplates', 'services', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'certificates', 'capabilities', 'serviceAccounts', 'controller', 'execSessions', 'logs'],
        verbs: ['get', 'list', 'create', 'update', 'patch', 'delete']
      },
      {
        apiGroups: [''],
        resources: ['fogs', 'router', 'tunnels', 'users', 'authUsers', 'authGroups', 'config', 'roles', 'roleBindings', 'systemMicroservices', 'systemApplications', 'systemExecSessions', 'systemLogs', 'cluster', 'natsOperator', 'natsBootstrap', 'natsHub'],
        verbs: ['get', 'list']
      }
    ]
  },
  VIEWER_ROLE: {
    name: 'viewer',
    get apiVersion () {
      return getRbacApiVersion()
    },
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['microservices', 'fogs', 'applications', 'systemMicroservices', 'systemApplications', 'applicationTemplates', 'services', 'router', 'natsOperator', 'natsBootstrap', 'natsHub', 'natsAccounts', 'natsUsers', 'natsAccountRules', 'natsUserRules', 'catalog', 'registries', 'secrets', 'configMaps', 'volumeMounts', 'certificates', 'capabilities', 'cluster', 'serviceAccounts', 'users', 'authUsers', 'authGroups', 'config', 'controller', 'roles', 'roleBindings'],
        verbs: ['get', 'list']
      }
    ]
  },
  AGENT_ADMIN_ROLE: {
    name: 'agent-admin',
    apiVersion: 'edgelet.iofog.org/v1',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: ['edgelet.iofog.org/v1'],
        resources: ['*'],
        verbs: ['*']
      }
    ]
  },
  MICROSERVICE_ROLE: {
    name: 'microservice',
    apiVersion: 'edgelet.iofog.org/v1',
    kind: 'Role',
    get namespace () {
      return getNamespace()
    },
    rules: [
      {
        apiGroups: ['edgelet.iofog.org/v1'],
        resources: [
          'microservices/config/self',
          'auth/whoami',
          'system/gps',
          'microservices/control/self'
        ],
        verbs: ['get']
      }
    ]
  }
}
