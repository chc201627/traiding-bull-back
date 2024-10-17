"use strict";

/**
 *  referral-code controller
 */
const ShortUniqueId = require("short-unique-id");

const uniqueId = () => {
  const uid = new ShortUniqueId({ length: 15 });
  const unique = uid();
  return unique;
};

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::referral-code.referral-code",
  ({ strapi }) => ({
    async create(ctx) {
      Object.assign(ctx.request.body.data, {
        users_owner_id: ctx.state.user.id,
        code: uniqueId(),
        status_id: 2,
      });
      const response = await super.create(ctx);
      return response;
    },

    async getTotalReferral(ctx) {
      try {
        const total = await strapi
          .service("api::referral-code.referral-code")
          .getCountReferrals(ctx);
        return total;
      } catch (error) {
        ctx.badRequest("Bad request: " + error);
      }
    },
    async getTotalReturnRefers(ctx) {
      try {
        let totalReferrals = await strapi
          .service("api::referral-code.referral-code")
          .getAllReferral(ctx);
        return totalReferrals;
      } catch (error) {}
    },
  })
);
