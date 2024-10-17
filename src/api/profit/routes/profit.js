'use strict';

/**
 * profit router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = (() => {
  const routerCore = createCoreRouter('api::profit.profit');
  return {
    get prefix() {
      return routerCore.prefix;
    },
    get routes() {
      return [...routerCore.routes, ...require('./01-custom-profit').routes];
    },
  };
})();
