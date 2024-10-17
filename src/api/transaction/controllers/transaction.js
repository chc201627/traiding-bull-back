"use strict";

/**
 *  transaction controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::transaction.transaction",
  ({ strapi }) => ({
    async allTransactionsByUser(ctx) {
      const userId = ctx.state.user.id;
      console.log(userId);
      const getAllTransactionByUser = await strapi
        .service("api::transaction.transaction")
        .allTransctionByUser(userId);

      return getAllTransactionByUser;
    },
    async allTransactionsPayedAndWithdrawal(ctx) {
      const transactionsPayedAndWithdrawal = await strapi
        .service("api::transaction.transaction")
        .transctionPayedAndWithdrawal();

      return transactionsPayedAndWithdrawal;
    },
  })
);
