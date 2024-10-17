"use strict";

/**
 *  spot controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::spot.spot", ({ strapi }) => ({
  async create(ctx) {
    // TODO test
    const userId = ctx.state.user.id;
    const generalSpotId = await strapi
      .service("api::spot.spot")
      .getGeneralSpotId(userId);
    let { spot_value: spotValue } = ctx.request.body.data;
    const amountValidation = await strapi
      .service("api::spot.spot")
      .validateAmount(spotValue, generalSpotId);
    if (!amountValidation) return ctx.response.badRequest("Invalid amount");

    Object.assign(ctx.request.body.data, {
      enabled_before_at: strapi.service("api::spot.spot").activeDate(),
      status_id: 2,
      user_id: ctx.state.user.id,
      generalspot_id: generalSpotId,
    });

    const response = await super.create(ctx);

    try {
      await strapi
        .service("api::generalspot.generalspot")
        .findAndUpdateGeneralSpotValue(generalSpotId, spotValue);
    } catch (error) {
      return ctx.response.serverUnavailable(
        `Error in server, please try later (Error en el servidor, intenta más tarde).`
      );
    }
    try {
      await strapi.service("api::transaction.transaction").createTransaction({
        ctx: ctx,
        spotId: response.data.id,
        generalSpotId,
      });
    } catch (error) {}

    if (!(await strapi.service("api::spot.spot").userCanPayUsdtTransfer(ctx))) {
      await strapi
        .service("api::spot.spot")
        .delegateEnergyToUserForUsdtTransfer(ctx);
    }
    await strapi.db.query("plugin::users-permissions.user").update({
      where: { id: userId },
      data: {
        generalspot: generalSpotId,
      },
    });

    return response;
  },
  async delegateEnergyUser(ctx) {
    try {
      if (
        !(await strapi.service("api::spot.spot").userCanPayUsdtTransfer(ctx))
      ) {
        return "User should recharge TRX.";
      }
      return "User has enough resources to pay usdt transfer";
    } catch {}
  },
  async getAllSpostsUser(ctx) {
    return await strapi.service("api::spot.spot").getAllSpostsUser(ctx);
  },
  async getTotalReturnRefers(ctx) {
    console.log(ctx);
  },
  async getTotalMonthlyAndYearlySpots() {
    return await strapi
      .service("api::spot.spot")
      .getTotalMonthlyAndYearlySport();
  },
  async getSpotPermanence() {
    return await strapi.service("api::spot.spot").getAllSpotPermanence();
  },
  async allSpotAdim() {
    return await strapi.service("api::spot.spot").getAllSpostAdmin();
  },
  async getDepositsAvilable() {
    return await strapi.service("api::spot.spot").getAllDepositsAvailability();
  },
  async getSpotAndInversorLastWeek() {
    const totalInvestorLastWeek = await strapi
      .service("api::spot.spot")
      .getAllInvestorLastWeek();
    const totalSpotSoldLastWeek = await strapi
      .service("api::spot.spot")
      .getAllSpotSoldLastWeek();
    const totalNewInvestments = await strapi
      .service("api::spot.spot")
      .getAllNewInvestments();
    return {
      totalSpotSoldLastWeek: totalSpotSoldLastWeek || 0,
      totalInvestorLastWeek: totalInvestorLastWeek || 0,
      totalNewInvestments,
    };
  },
}));
