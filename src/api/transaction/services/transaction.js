"use strict";

/**
 * transaction service.
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::transaction.transaction",
  ({ strapi }) => ({
    async createTransaction({ ctx, spotId, generalSpotId }) {
      const { address: addressReciever } = await strapi.db
        .query("api::admin-wallet.admin-wallet")
        .findOne({
          select: ["address"],
          where: { type: "collection" },
        });
      const { user_id: userId } = ctx.state.user.id;

      const { spot_value: spotValue, collected_hash: collectedHash } =
        ctx.request.body.data;
      return await strapi.entityService.create("api::transaction.transaction", {
        data: {
          balance: spotValue,
          balance_pre_transaction: 0,
          balance_post_transaction: spotValue,
          address_reciever: addressReciever,
          transaction_hash: collectedHash,
          type: "BUY",
          user_id: userId,
          spot_id: spotId,
          generalspot_id: generalSpotId,
        },
      });
    },
    async allTransctionByUser(ctx) {
      const allTransactions = await strapi.db
        .query("api::transaction.transaction")
        .findMany({
          where: { user_id: ctx },
          populate: true,
        });

      return allTransactions.map(
        ({
          transaction_hash,
          balance,
          balance_pre_transaction,
          type,
          settlement_generated,
          settlement_beneficiary,
          pay_value,
          settlement_total,
          createdAt,
          spot_id: { id },
        }) => ({
          balance,
          balance_pre_transaction,
          createdAt,
          type,
          transaction_hash,
          settlement_generated,
          settlement_beneficiary,
          pay_value,
          settlement_total,
          spot_id: id || 0,
        })
      );
    },
    async transctionPayedAndWithdrawal() {
      const allTransactions = await strapi.db
        .query("api::transaction.transaction")
        .findMany({
          populate: true,
        });

      return allTransactions
        .filter(
          (transaction) =>
            transaction.type === "PAYED" || transaction.type === "WITHDRAWAL"
        )
        .map(
          ({
            transaction_hash,
            balance,
            balance_pre_transaction,
            type,
            settlement_generated,
            settlement_beneficiary,
            pay_value,
            settlement_total,
            createdAt,
            spot_id: { id },
            user_id: { username },
          }) => ({
            username,
            balance,
            balance_pre_transaction,
            createdAt,
            type,
            transaction_hash,
            settlement_generated,
            settlement_beneficiary,
            pay_value,
            settlement_total,
            spot_id: id || 0,
          })
        );
    },
  })
);
