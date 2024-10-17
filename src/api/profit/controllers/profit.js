"use strict";

/**
 * profit controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::profit.profit", ({ strapi }) => ({
  async getRoi() {
    return 714;
  },
  async getDrawdown() {
    return 12.3;
  },
  async getStandardDeviation() {
    return 20.7;
  },
  async executePreSettlement(ctx) {
    const { data } = ctx.request.body;

    const execute = await strapi
      .service("api::profit.profit")
      .generatePreSettlement(data);

    return execute;
  },
  async totalEarnings(ctx) {
    const userId = ctx.state.user.id;

    const totalEarnings = await strapi
      .service("api::profit.profit")
      .totalEarnings(userId);

    return totalEarnings;
  },
}));
