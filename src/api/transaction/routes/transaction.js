"use strict";

/**
 * transaction router.
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::transaction.transaction");
module.exports = (() => {
  const routerCore = createCoreRouter("api::transaction.transaction");
  return {
    get prefix() {
      return routerCore.prefix;
    },
    get routes() {
      return [
        ...routerCore.routes,
        ...require("./01-custom-transaction").routes,
      ];
    },
  };
})();
