"use strict";

/**
 * profit service
 */
const utils = require("@strapi/utils");
const { ApplicationError, ValidationError } = utils.errors;

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::profit.profit", ({ strapi }) => ({
  async generatePreSettlement(profit) {
    const settelmentDay = Date.parse(profit.settlement_day);
    const { broker, company } = await strapi
      .service("api::rate.rate")
      .getProfitRate();
    const settlement = await strapi
      .service("api::settlement.settlement")
      .excutePreSettlement(settelmentDay);

    const totalSettlement = await strapi
      .service("api::settlement.settlement")
      .totalPreSettlements(settlement);
    const companyValue = (profit.total_profit * company) / 100;
    const brokerValue = (profit.total_profit * broker) / 100;

    if (totalSettlement > companyValue) {
      throw new ApplicationError("The value of the company is very low.!");
    }

    const data = {
      total_profit: profit.total_profit,
      company: companyValue,
      broker: brokerValue,
      settlement_day: settelmentDay,
    };
    const newProfit = await strapi.db.query("api::profit.profit").create({
      data,
    });

    const newSettlement = await strapi
      .service("api::settlement.settlement")
      .setProfitId(settlement, newProfit.id);

    const saveSattlements = await strapi
      .service("api::settlement.settlement")
      .savePreSettlements(newSettlement);
    const saveTotalPresettlement = await strapi
      .service("api::settlement.settlement")
      .saveTotalPresettlement();
    return newProfit;
  },
  async totalEarnings(userId) {
    const allTransactions =
      (await strapi.db.query("api::transaction.transaction").findMany({
        where: { user_id: userId },
        populate: true,
      })) || 0;
    const totalDeposits =
      allTransactions
        .filter((transaction) => transaction.type === "BUY")
        .map(({ balance }) => ({ balance }))
        .reduce((acum, obj) => acum + obj.balance, 0) || 0;
    const totalEarnings =
      allTransactions
        .filter(
          (transaction) =>
            transaction.type === "REINVESTED" || transaction.type === "PAYED"
        )
        .map(({ settlement_total }) => ({ settlement_total }))
        .reduce((acum, obj) => acum + obj.settlement_total, 0) || 0;
    const rentability = Number.isNaN((totalEarnings / totalDeposits) * 100)
      ? 0
      : ((totalEarnings / totalDeposits) * 100).toFixed(1);

    return [
      {
        totalDeposits: totalDeposits,
        totalEarnings: totalEarnings,
        rentability: rentability || 0,
      },
    ];
  },
}));
