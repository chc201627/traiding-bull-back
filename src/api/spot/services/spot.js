"use strict";
const blockchain = require("../../../utils/blockchain/index");
const util = require("../../../utils/");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::spot.spot", ({ strapi }) => ({
  activeDate() {
    let today = new Date();
    let activateDate = new Date(today);
    if (today.getDay() == 0 || today.getDay() == 1 || today.getDay() == 2) {
      activateDate.setDate(today.getDate() + 3);
      return activateDate;
    } else if (today.getDay() == 3) {
      activateDate.setDate(today.getDate() + 6);
      return activateDate;
    } else {
      activateDate.setDate(today.getDate() + 5);
      return activateDate;
    }
  },
  async validateAmount(amount, generalspot_id) {
    let { min_value, max_value } = await strapi
      .service("api::generalspot.generalspot")
      .getGeneralSpot(generalspot_id);

    return Number(amount) < Number(min_value) ||
      Number(amount) > Number(max_value)
      ? false
      : true;
  },
  async userCanPayUsdtTransfer(ctx) {
    const userId = ctx.state.user.id;
    const { username, hasDelegatedEnergy } = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: userId },
      });
    if (hasDelegatedEnergy) return true;
    const address = username;
    const accountTotalEnergy = await blockchain.getAccountTotalEnergy(address);

    return accountTotalEnergy >= blockchain.MAX_ENERGY_FOR_USDT_TRANSFER;
  },
  async delegateEnergyToUserForUsdtTransfer(ctx) {
    const userId = ctx.state.user.id;
    const { username } = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: userId },
      });
    const address = username;
    const receipt = await blockchain.giveEnergy(
      address,
      blockchain.MAX_ENERGY_FOR_USDT_TRANSFER
    );
    await strapi.db.query("plugin::users-permissions.user").update({
      where: { id: userId },
      data: {
        hasDelegatedEnergy: true,
      },
    });
    return receipt;
  },
  async getAllSpostsUser(ctx) {
    const userId = ctx.state.user.id;
    const allSpot = await strapi.db.query("api::spot.spot").findMany({
      where: { user_id: userId },
      populate: true,
    });
    return allSpot || 0;
  },
  async getAllSpostsActive() {
    const allSpot = await strapi.db.query("api::spot.spot").findMany({
      where: { status: "ACTIVE" },
      populate: true,
    });
    return allSpot || 0;
  },
  async getAllSpostAdmin() {
    const allSpot = await strapi.db.query("api::spot.spot").findMany({
      populate: true,
    });
    // console.log(allSpot);
    const allSpotList = allSpot.map(
      ({
        id,
        spot_value,
        is_reinvest,
        is_sell,
        status,
        permanence_id: { name },
        user_id: { username },
      }) => {
        return {
          username,
          id,
          spot_value,
          status,
          name,
          is_reinvest,
          is_sell,
        };
      }
    );
    // console.log(allSpotList);
    return allSpotList || 0;
  },
  async getAllSpotPermanence() {
    const countSpotMonthly = await strapi.db.query("api::spot.spot").count({
      where: {
        permanence_id: 1,
      },
      populate: true,
    });
    const countSpotYearly = await strapi.db.query("api::spot.spot").count({
      where: {
        permanence_id: 2,
      },
      populate: true,
    });
    const countSpotTotal = await strapi.db.query("api::spot.spot").count({
      populate: true,
    });
    const spotDistributionMonthly =
      (Number(countSpotMonthly) / Number(countSpotTotal)) * 100 || 0;
    const spotDistributionYearly =
      (Number(countSpotYearly) / Number(countSpotTotal)) * 100 || 0;
    return [
      {
        status: "Yearly",
        quantity: countSpotYearly,
        value: spotDistributionYearly,
      },
      {
        status: "Avialable",
        quantity: countSpotTotal,
        value: spotDistributionMonthly,
      },
      {
        status: "Monthly",
        quantity: countSpotMonthly,
        value: spotDistributionMonthly,
      },
    ];
  },
  async getAllDepositsAvailability() {
    const { total_value, value_used: sold_out } = await strapi.db
      .query("api::generalspot.generalspot")
      .findOne({
        select: ["total_value", "value_used"],
      });
    const total_avaliable = Number(total_value) - Number(sold_out);
    return {
      total_value,
      sold_out,
      total_avaliable,
    };
  },
  async getAllSpotSoldLastWeek() {
    const lastWeek = util.getLastWeekDates();
    const totalSpot = await strapi.db.query("api::spot.spot").findMany({
      where: {
        createdAt: { $gt: lastWeek },
      },
    });

    return totalSpot.reduce((acum, obj) => acum + Number(obj.spot_value), 0);
  },
  async getAllNewInvestments() {
    const lastWeek = util.getLastWeekDates();
    const totalSpot = await strapi.db.query("api::spot.spot").findMany({
      select: ["spot_value"],
      where: {
        createdAt: { $gt: lastWeek },
      },
      populate: true,
    });
    const allInvestments = totalSpot.map(
      ({
        spot_value,
        permanence_id: { name: permance },
        user_id: { username },
        user_id: { createdAt },
      }) => {
        return {
          spotValue: spot_value,
          permance,
          username,
          createdAt,
        };
      }
    );

    return allInvestments;
  },
  async getTotalMonthlyAndYearlySport() {
    const totalActivateSpots = await strapi
      .service("api::spot.spot")
      .getAllSpostsActive();

    const totalMonthly = await strapi
      .service("api::spot.spot")
      .totalTypeSpot(totalActivateSpots, "Monthly");

    const totalYearly = await strapi
      .service("api::spot.spot")
      .totalTypeSpot(totalActivateSpots, "Year");

    return {
      totalMonthly,
      totalYearly,
      total: totalMonthly + totalYearly,
    };
  },
  async totalTypeSpot(allSpots, type) {
    return allSpots
      .filter((spot) => {
        return spot.permanence_id.name === type && spot.status === "ACTIVE";
      })
      .reduce((acum, spot) => acum + spot.spot_value, 0);
  },
  async getAllInvestorLastWeek() {
    const lastWeek = util.getLastWeekDates();
    const totalInversor = await strapi.db
      .query("plugin::users-permissions.user")
      .count({
        where: {
          createdAt: { $gt: lastWeek },
        },
      });
    return totalInversor;
  },
  async getGeneralSpotId(userId) {
    const {
      users_owner_id: { username },
    } = await strapi.db.query("api::referral-code.referral-code").findOne({
      where: { users_refer_id: userId },
      populate: true,
    });
    const {
      role: { name: roleName },
    } = await strapi.db.query("plugin::users-permissions.user").findOne({
      where: { username: username },
      populate: true,
    });
    if (roleName === "Authenticated") {
      const { generalspot: generalSpotId } = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { username: username },
        });
      return Number(generalSpotId);
    } else if (roleName === "Commercial") {
      const {
        generalspot_commercial: { id: generalSpotId },
      } = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { username: username },
        populate: true,
      });
      return generalSpotId;
    }
  },
}));
