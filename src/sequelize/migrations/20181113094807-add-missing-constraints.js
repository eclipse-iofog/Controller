'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Flows', ['user_id'], {
      type: 'FOREIGN KEY',
      name: 'userId',
      references: {
        name: 'userId',
        table: 'Users',
        field: 'id'
      },
      onDelete: 'cascade'
    }).then(() => {
      return queryInterface.addConstraint('Microservices', ['user_id'], {
        type: 'FOREIGN KEY',
        name: 'userId',
        references: {
          name: 'userId',
          table: 'Users',
          field: 'id'
        },
        onDelete: 'cascade'
      }).then(() => {
        return queryInterface.addConstraint('Microservices', ['iofog_uuid'], {
          type: 'FOREIGN KEY',
          name: 'iofogUuid',
          references: {
            name: 'iofogUuid',
            table: 'Fogs',
            field: 'uuid'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('Microservices', ['catalog_item_id'], {
          type: 'FOREIGN KEY',
          name: 'catalogItemId',
          references: {
            name: 'catalogItemId',
            table: 'CatalogItems',
            field: 'id'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('Microservices', ['registry_id'], {
          type: 'FOREIGN KEY',
          name: 'registryId',
          references: {
            name: 'registryId',
            table: 'Registries',
            field: 'id'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('Microservices', ['flow_id'], {
          type: 'FOREIGN KEY',
          name: 'flowId',
          references: {
            name: 'flowId',
            table: 'Flows',
            field: 'id'
          },
          onDelete: 'cascade'
        })
      }).then(() => {
        return queryInterface.addConstraint('ChangeTrackings', ['iofog_uuid'], {
          type: 'FOREIGN KEY',
          name: 'iofogUuid',
          references: {
            name: 'iofogUuid',
            table: 'Fogs',
            field: 'uuid'
          },
          onDelete: 'cascade'
        })
      })
    }).then(() => {
      return queryInterface.addConstraint('MicroservicePorts', ['user_id'], {
        type: 'FOREIGN KEY',
        name: 'userId',
        references: {
          name: 'userId',
          table: 'Users',
          field: 'id'
        },
        onDelete: 'cascade'
      })
    }).then(() => {
      return queryInterface.addConstraint('MicroservicePorts', ['microservice_uuid'], {
        type: 'FOREIGN KEY',
        name: 'microserviceUuid',
        references: {
          name: 'microserviceUuid',
          table: 'Microservices',
          field: 'uuid'
        },
        onDelete: 'cascade'
      })
    });
  },

  down:
    (queryInterface, Sequelize) => {

    // for SQLite
      return queryInterface.renameColumn('Flows', 'user_id', 'user_id')
        .then(() => {
          return queryInterface.renameColumn('Microservices', 'user_id', 'user_id')
        }).then(() => {
          return queryInterface.renameColumn('ChangeTrackings', 'iofog_uuid', 'iofog_uuid')
        }).then(() => {
          return queryInterface.renameColumn('MicroservicePorts', 'user_id', 'user_id')
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
};
