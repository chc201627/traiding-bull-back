'use strict';

/**
 * settlement router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = (() => {
  const routerCore = createCoreRouter('api::settlement.settlement');
  return {
    get prefix() {
      return routerCore.prefix;
    },
    get routes() {
      return [
        ...routerCore.routes,
        ...require('./01-custom-settlement').routes,
      ];
    },
  };
})();
