"use strict";

/**
 * settlement controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::settlement.settlement",
  ({ strapi }) => ({
    async executeSettlement(ctx) {
      const execute = await strapi
        .service("api::settlement.settlement")
        .excuteSettlement();

      return execute;
    },
    async lastPreSettelment() {
      const execute = await strapi
        .service("api::settlement.settlement")
        .getLasPreSettelment();
      return execute;
    },
    async allTransactionPendingPay() {
      const execute = await strapi
        .service("api::settlement.settlement")
        .allTransactionPendingPay();

      return execute;
    },
    async allTransactionPendingWithDrawal() {
      const execute = await strapi
        .service("api::settlement.settlement")
        .allTransactionPendingWithDrawal();

      return execute;
    },
    async totalPreSettelmentReinvestAndWithdrawal() {
      const execute = await strapi
        .service("api::settlement.settlement")
        .totalPreSettelmentReinvestAndWithdrawal();

      return execute;
    },
  })
);
