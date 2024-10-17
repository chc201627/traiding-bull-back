"use strict";

/**
 * referral-code router.
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = (() => {
  const routerCore = createCoreRouter("api::referral-code.referral-code");
  return {
    get prefix() {
      return routerCore.prefix;
    },
    get routes() {
      return [
        ...routerCore.routes,
        ...require("./01-custom-referral-routes").routes,
      ];
    },
  };
})();
