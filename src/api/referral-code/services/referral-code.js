"use strict";

/**
 * referral-code service.
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::referral-code.referral-code",
  ({ strapi }) => ({
    async getCountReferrals(ctx) {
      const userId = ctx.state.user.id;
      const totalReferrals = await strapi.db
        .query("api::referral-code.referral-code")
        .count({
          where: {
            $and: [
              {
                status_id: 3,
              },
              {
                users_owner_id: userId,
              },
            ],
          },

          populate: true,
        });

      return {
        status: "success",
        totalReferrals: totalReferrals || 0,
        totalReturnReferrals: Math.trunc(
          (await strapi
            .service("api::referral-code.referral-code")
            .getTotalReferralPercentage(userId)) || 0
        ),
      };
    },
    async getUserReferrals(userId) {
      let returnReferrals = await strapi.db
        .query("api::referral-code.referral-code")
        .findMany({
          where: {
            $and: [
              {
                status_id: 3,
              },
              {
                users_owner_id: userId,
              },
            ],
          },

          populate: true,
        });
      const totalReturnReferrals = returnReferrals.map(
        (totalReturnReferral) => totalReturnReferral.users_refer_id?.id
      );

      const totalReturnReferralsFilter = totalReturnReferrals.filter(function (
        el
      ) {
        return el != null;
      });

      return totalReturnReferralsFilter;
    },
    async getTotalReferralSpot(userId) {
      let beneficiaryID = await strapi
        .service("api::referral-code.referral-code")
        .getUserReferrals(userId);
      let getValueSpotBeneficiary = await Promise.all(
        beneficiaryID.map(async (beneficiary) => {
          return await strapi.db.query("api::spot.spot").findMany({
            select: ["spot_value", "enabled_before_at", "status", "off_date"],

            where: {
              user_id: beneficiary,
              status: "ACTIVE",
            },
          });
        })
      );

      return getValueSpotBeneficiary
        .reduce((c, v) => c.concat(v), [])
        .map((o, index) => ({ id: index + 1, ...o }));
    },
    async getTotalReferralPercentage(userId) {
      let objAllSpot = await strapi
        .service("api::referral-code.referral-code")
        .getTotalReferralSpot(userId);
      let allValueSpot = objAllSpot.map((spot) => spot.spot_value);
      let { beneficiary_rate } = await strapi.db
        .query("api::rate.rate")
        .findOne({
          select: ["beneficiary_rate"],
        });
      let sum = allValueSpot.reduce(
        (acc, value) =>
          parseFloat(acc) +
          parseFloat(value) * parseFloat(beneficiary_rate / 100),
        0
      );
      return sum;
    },
    async getAllReferral(ctx) {
      const userId = ctx.state.user.id;
      let valueSpot2 = await strapi
        .service("api::referral-code.referral-code")
        .getTotalReferralSpot(userId);
      let { beneficiary_rate } = await strapi.db
        .query("api::rate.rate")
        .findOne({
          select: ["beneficiary_rate"],
        });
      return valueSpot2.map((value) => ({
        ...value,
        money_return: Math.trunc(
          parseFloat(value.spot_value) * parseFloat(beneficiary_rate / 100)
        ),
        beneficiary_rate: beneficiary_rate,
      }));
    },
  })
);
