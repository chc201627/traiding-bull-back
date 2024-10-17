"use strict";

/**
 * spot router.
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = (() => {
  const routerCore = createCoreRouter("api::spot.spot");
  return {
    get prefix() {
      return routerCore.prefix;
    },
    get routes() {
      return [...routerCore.routes, ...require("./01-custom-spot").routes];
    },
  };
})();
