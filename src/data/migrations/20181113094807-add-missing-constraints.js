'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Flows', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'userId_fkey_constraint',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'cascade'
    })
    // .then(() => {
    //   return queryInterface.addConstraint('Microservices', ['user_id'], {
    //     fields: ['user_id'],
    //     type: 'foreign key',
    //     name: 'userId_fkey_constraint',
    //     references: {
    //       table: 'Users',
    //       field: 'id'
    //     },
    //     onDelete: 'cascade'
    //   })
    //   .then(() => {
    //     return queryInterface.addConstraint('Microservices', {
    //       fields: ['iofog_uuid'],
    //       type: 'foreign key',
    //       name: 'iofogUuid_fkey_constraint',
    //       references: {
    //         table: 'Fogs',
    //         field: 'uuid'
    //       },
    //       onDelete: 'cascade'
    //     })
    //   })
    //   .then(() => {
    //     return queryInterface.addConstraint('Microservices', {
    //       fields: ['catalog_item_id'],
    //       type: 'foreign key',
    //       name: 'catalogItemId_fkey_constraint',
    //       references: {
    //         table: 'CatalogItems',
    //         field: 'id'
    //       },
    //       onDelete: 'cascade'
    //     })
    //   })
    //   .then(() => {
    //     return queryInterface.addConstraint('Microservices', {
    //       fields: ['registry_id'],
    //       type: 'foreign key',
    //       name: 'registryId_fkey_constraint',
    //       references: {
    //         table: 'Registries',
    //         field: 'id'
    //       },
    //       onDelete: 'cascade'
    //     })
    //   })
    //   .then(() => {
    //     return queryInterface.addConstraint('Microservices', {
    //       fields: ['flow_id'],
    //       type: 'foreign key',
    //       name: 'flowId_fkey_constraint',
    //       references: {
    //         table: 'Flows',
    //         field: 'id'
    //       },
    //       onDelete: 'cascade'
    //     })
    //   })
    //   .then(() => {
    //     return queryInterface.addConstraint('ChangeTrackings', {
    //       fields: ['iofog_uuid'],
    //       type: 'foreign key',
    //       name: 'iofogUuid_fkey_constraint',
    //       references: {
    //         table: 'Fogs',
    //         field: 'uuid'
    //       },
    //       onDelete: 'cascade'
    //     })
    //   })
    // })
    // .then(() => {
    //   return queryInterface.addConstraint('MicroservicePorts', {
    //     fields: ['user_id'],
    //     type: 'foreign key',
    //     name: 'userId_fkey_constraint',
    //     references: {
    //       table: 'Users',
    //       field: 'id'
    //     },
    //     onDelete: 'cascade'
    //   })
    // })
    // .then(() => {
    //   return queryInterface.addConstraint('MicroservicePorts', {
    //     fields: ['microservice_uuid'],
    //     type: 'foreign key',
    //     name: 'microserviceUuid_fkey_constraint',
    //     references: {
    //       table: 'Microservices',
    //       field: 'uuid'
    //     },
    //     onDelete: 'cascade'
    //   })
    // })
  },

  down:
    (queryInterface, Sequelize) => {
    // for SQLite
      return queryInterface.renameColumn('Flows', 'user_id', 'user_id1')
        .then(() => {
          return queryInterface.renameColumn('Flows', 'user_id1', 'user_id')
        }).then(() => {
          return queryInterface.renameColumn('Microservices', 'user_id', 'user_id1')
        }).then(() => {
          return queryInterface.renameColumn('Microservices', 'user_id1', 'user_id')
        }).then(() => {
          return queryInterface.renameColumn('ChangeTrackings', 'iofog_uuid', 'iofog_uuid1')
        }).then(() => {
          return queryInterface.renameColumn('ChangeTrackings', 'iofog_uuid1', 'iofog_uuid')
        }).then(() => {
          return queryInterface.renameColumn('MicroservicePorts', 'user_id', 'user_id1')
        }).then(() => {
          return queryInterface.renameColumn('MicroservicePorts', 'user_id1', 'user_id')
        })

      // for other DB

      // return queryInterface.removeConstraint('Flows', 'userId')
      //   .then(() => {
      //     return queryInterface.removeConstraint('Microservices', 'userId')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('Microservices', 'iofogUuid')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('Microservices', 'catalogItemId')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('Microservices', 'registryId')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('Microservices', 'flowId')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('ChangeTrackings', 'iofogUuid')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('MicroservicePorts', 'userId')
      //   }).then(() => {
      //     return queryInterface.removeConstraint('MicroservicePorts', 'microserviceUuid')
      //   });
    }
}
