"use strict";

const settlement = require("../controllers/settlement");

/**
 * settlement service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::settlement.settlement",
  ({ strapi }) => ({
    async activeDays(spot, date) {
      const fecha = new Date(date);

      function removeTime(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
      const fechaSpot = new Date(spot.enabled_before_at);

      const activeDays =
        Math.floor((fecha - removeTime(fechaSpot)) / 86400000) < 0
          ? 0
          : Math.floor((fecha - removeTime(fechaSpot)) / 86400000);

      return activeDays > fecha.getDate() ? fecha.getDate() : activeDays;
    },
    async percentPayed(activeDays, date) {
      const fecha = new Date(date).getDate();

      return Math.floor((activeDays * 100) / fecha);
    },

    async expectedSettlement(spot) {
      const rate = await strapi
        .service("api::rate.rate")
        .getRatebyType(spot.permanence_id.id);

      return Math.floor((spot.spot_value * rate) / 100);
    },
    async settlementGenerated(expectedSettlement, percentPayed) {
      return Math.floor(expectedSettlement * (percentPayed / 100));
    },
    async getTotalPerbeneficiary(spot) {
      return await strapi
        .service("api::referral-code.referral-code")
        .getTotalReferralPercentage(spot.user_id.id);
    },
    async isBeneficiaryAlready(users, userId) {
      return users.includes(userId);
    },
    async totalPreSettlements(settlements) {
      let total = 0;

      settlements.map((settlement) => {
        total += settlement.settlement_generated + settlement.beneficiary;
      });
      return total;
    },
    async setProfitId(settlements, profitId) {
      try {
        settlements.map((settlement) => {
          settlement.profit_id = profitId;
        });

        await strapi.db.query("api::generalspot.generalspot").updateMany({
          data: {
            last_profit: profitId,
          },
        });
      } catch (error) {}

      return settlements;
    },
    async excutePreSettlement(date) {
      const spots = await strapi.service("api::spot.spot").getAllSpostsActive();

      const beneficiaryExecute = [];

      const settlements = await Promise.all(
        spots.map(async (spot) => {
          const beneficiaryOk = await strapi
            .service("api::settlement.settlement")
            .isBeneficiaryAlready(beneficiaryExecute, spot.user_id.id);

          const beneficiary = !beneficiaryOk
            ? await strapi
                .service("api::settlement.settlement")
                .getTotalPerbeneficiary(spot)
            : 0;

          beneficiaryExecute.push(spot.user_id.id);
          const rate = await strapi
            .service("api::rate.rate")
            .getRatebyType(spot.permanence_id.id);
          const active_days = await strapi
            .service("api::settlement.settlement")
            .activeDays(spot, date);
          const payed_percent = await strapi
            .service("api::settlement.settlement")
            .percentPayed(active_days, date);
          const desired_settlement = await strapi
            .service("api::settlement.settlement")
            .expectedSettlement(spot);
          const settlement_generated = await strapi
            .service("api::settlement.settlement")
            .settlementGenerated(desired_settlement, payed_percent);

          let settlement = {
            profit_id: 0,
            user_id: spot.user_id.id,
            investment: spot.spot_value,
            rate,
            active_days,
            permanence_id: spot.permanence_id.id,
            payed_percent,
            desired_settlement,
            settlement_generated,
            beneficiary: Math.trunc(beneficiary),
            is_reinvest: spot.is_reinvest,
            spot_id: spot.id,
            is_sell: spot.is_sell,
            generalspot_id: spot.generalspot_id.id,
            expired_beneficiary: spot.expired_beneficiary,
          };

          return await settlement;
        })
      );

      return settlements;
    },
    async savePreSettlements(settlements) {
      try {
        let totalSettlement = 0;
        settlements.map(async (settlement) => {
          await strapi.db
            .query("api::settlement.settlement")
            .create({ data: settlement });

          totalSettlement++;
        });

        return totalSettlement;
      } catch (error) {}
    },

    async saveTotalPresettlement() {
      const {
        settlementsMontlhy,
        settlementsYear,
        settlementsBeneficiary,
        totalSettlement: totalSettlementGeneralSpot,
      } = await strapi
        .service("api::settlement.settlement")
        .distributionAverage();
      try {
        await strapi.query("api::generalspot.generalspot").update({
          where: { id: 1 },
          data: {
            settlementsyear: settlementsYear,
            settlementsbeneficiary: settlementsBeneficiary,
            settlementsmontlhy: settlementsMontlhy,
            totalSettlementgeneralspot: totalSettlementGeneralSpot,
          },
        });
      } catch (error) {
        console.log("saveTotalPresettlement", error);
      }
    },

    async excuteSettlement() {
      const { last_profit: profit_id } = await strapi.db
        .query("api::generalspot.generalspot")
        .findOne({ select: ["last_profit"], where: { id: 1 } });
      const settlements = await strapi.db
        .query("api::settlement.settlement")
        .findMany({
          where: {
            profit_id,
          },
          populate: true,
        });

      let totalReinvest = 0;
      let totalWithdrawal = 0;
      const pendingPays = await Promise.all(
        settlements.map(async (settlement) => {
          const generalSpot = await strapi.db
            .query("api::generalspot.generalspot")
            .findOne({ where: { id: settlement.generalspot_id.id } });
          const spot = await strapi.db
            .query("api::spot.spot")
            .findOne({ where: { id: settlement.spot_id }, populate: true });
          if (settlement.is_reinvest && settlement.is_sell != true) {
            totalReinvest +=
              Number(settlement.settlement_generated) +
              Number(settlement.beneficiary);

            await strapi.db.query("api::spot.spot").update({
              where: { id: settlement.spot_id },
              data: {
                spot_value:
                  spot.spot_value +
                  settlement.settlement_generated +
                  settlement.beneficiary,
                last_settlement:
                  settlement.settlement_generated + settlement.beneficiary,
              },
            });
            let transaction = {
              balance:
                spot.spot_value +
                settlement.settlement_generated +
                settlement.beneficiary,
              balance_pre_transaction: spot.spot_value,
              balance_post_transaction:
                spot.spot_value +
                settlement.settlement_generated +
                settlement.beneficiary,
              user_id: spot.user_id.id,
              spot_id: settlement.spot_id,
              settlement_generated: settlement.settlement_generated,
              settlement_beneficiary: settlement.beneficiary,
              settlement_total:
                settlement.settlement_generated + settlement.beneficiary,
              type: "REINVESTED",
              profit_id: profit_id,
              generalspot_id: settlement.generalspot_id.id,
            };
            console.log("REINVESTED", {
              id: settlement.generalspot_id.id,
              generalspotvalue: generalSpot.value_used,
              settlement_generated: settlement.settlement_generated,
              beneficiary: settlement.beneficiary,
            });
            const valueUsedSpot =
              generalSpot.value_used +
              settlement.settlement_generated +
              settlement.beneficiary;
            await strapi.db.query("api::generalspot.generalspot").update({
              where: { id: settlement.generalspot_id.id },
              data: {
                value_used: valueUsedSpot,
              },
            });
            console.log("REINVESTED POS", {
              id: settlement.generalspot_id.id,
              generalspotvalue: generalSpot.value_used,
              settlement_generated: settlement.settlement_generated,
              beneficiary: settlement.beneficiary,
            });
            await strapi.db
              .query("api::transaction.transaction")
              .create({ data: transaction });
            ///TODO: Implement Transaction insert Service
          } else if (settlement.is_reinvest != true && settlement.is_sell) {
            totalWithdrawal +=
              spot.spot_value +
              Number(settlement.settlement_generated) +
              Number(settlement.beneficiary);
            await strapi.db.query("api::spot.spot").update({
              where: { id: settlement.spot_id },
              data: {
                status: "WITHDRAWAL",
                spot_value:
                  spot.spot_value +
                  settlement.settlement_generated +
                  settlement.beneficiary,
                last_settlement:
                  settlement.settlement_generated + settlement.beneficiary,
              },
            });

            const pendingPay = {
              user: settlement.user_id.username,
              pay_value:
                spot.spot_value +
                settlement.settlement_generated +
                settlement.beneficiary,
              collected_hash: "",
              type: "PENDING_WITHDRAWAL",
            };
            const pay_value = Math.floor(
              pendingPay.pay_value - (3 * pendingPay.pay_value) / 100
            );
            let transaction = {
              balance:
                spot.spot_value +
                settlement.settlement_generated +
                settlement.beneficiary,
              balance_pre_transaction: spot.spot_value,
              address_reciever: spot.user_id.username,
              balance_post_transaction:
                spot.spot_value +
                settlement.settlement_generated +
                settlement.beneficiary,
              user_id: spot.user_id.id,
              spot_id: settlement.spot_id,
              settlement_generated: settlement.settlement_generated,
              settlement_beneficiary: settlement.beneficiary,
              pay_value,
              settlement_total:
                settlement.settlement_generated + settlement.beneficiary,
              type: "PENDING_WITHDRAWAL",
              profit_id: profit_id,
              generalspot_id: settlement.generalspot_id.id,
            };
            await strapi.db.query("api::generalspot.generalspot").update({
              where: { id: settlement.generalspot_id.id },
              data: {
                value_used:
                  generalSpot.value_used -
                  (spot.spot_value +
                    settlement.settlement_generated +
                    settlement.beneficiary),
              },
            });

            await strapi.db
              .query("api::transaction.transaction")
              .create({ data: transaction });
            ///TODO: Implement Transaction insert Service
            return await pendingPay;
          } else {
            await strapi.db.query("api::spot.spot").update({
              where: { id: settlement.spot_id },
              data: {
                last_settlement:
                  settlement.settlement_generated + settlement.beneficiary,
              },
            });
            const pendingPay = {
              user: settlement.user_id.username,
              pay_value:
                settlement.settlement_generated + settlement.beneficiary,
              collected_hash: "",
              type: "PENDING_PAY",
            };
            const pay_value = Math.floor(
              pendingPay.pay_value - (3 * pendingPay.pay_value) / 100
            );

            let transaction = {
              balance: spot.spot_value,
              balance_pre_transaction: spot.spot_value,
              balance_post_transaction: spot.spot_value,
              address_reciever: spot.user_id.username,
              user_id: spot.user_id.id,
              spot_id: settlement.spot_id,
              settlement_generated: settlement.settlement_generated,
              settlement_beneficiary: settlement.beneficiary,
              settlement_total:
                settlement.settlement_generated + settlement.beneficiary,
              pay_value,
              type: "PENDING_PAY",
              profit_id: profit_id,
              generalspot_id: settlement.generalspot_id.id,
            };
            await strapi.db.query("api::generalspot.generalspot").update({
              where: { id: settlement.generalspot_id.id },
              data: {
                value_used:
                  generalSpot.value_used -
                  (settlement.settlement_generated + settlement.beneficiary),
              },
            });
            await strapi.db
              .query("api::transaction.transaction")
              .create({ data: transaction });

            return await pendingPay;
          }

          ///TODO: Implement Transaction insert Service
        })
      );

      const generalSpot = await strapi.db
        .query("api::generalspot.generalspot")
        .findOne({ where: { id: 1 } });
      const generalSpots = await strapi.db
        .query("api::generalspot.generalspot")
        .findMany({ select: ["value_used"] });

      const totalValueUsedGeneralSpot = await strapi
        .service("api::settlement.settlement")
        .sumValueUsedGeneralSpot(generalSpots);
      const lastProfit = await strapi.db
        .query("api::profit.profit")
        .findOne({ where: { id: generalSpot.last_profit } });
      const rates = await strapi.db
        .query("api::rate.rate")
        .findOne({ where: { id: 1 } });

      await strapi.db.query("api::historical-profit.historical-profit").create({
        data: {
          value_used_generalspot:
            totalValueUsedGeneralSpot + totalReinvest - totalWithdrawal,
          total_reinvest: totalReinvest,
          total_withdrawal: totalWithdrawal,
          settlementsyear: generalSpot.settlementsyear,
          settlementsbeneficiary: generalSpot.settlementsbeneficiary,
          settlementsmontlhy: generalSpot.settlementsmontlhy,
          totalSettlementgeneralspot: generalSpot.totalSettlementgeneralspot,
          beneficiary_rate: rates.beneficiary_rate,
          monthly_rate: rates.monthly_rate,
          yearly_rate: rates.yearly_rate,
          company_rate: rates.company,
          broker_rate: rates.broker,
          profit_id: generalSpot.last_profit,
          broker_profit: lastProfit.broker,
          company_profit: lastProfit.company,
          total_profit: lastProfit.total_profit,
        },
      });

      await strapi.db.query("api::generalspot.generalspot").update({
        where: { id: 1 },
        data: {
          settelment_status: true,
        },
      });

      return pendingPays.filter((pendingPay) => pendingPay);
    },
    async sumValueUsedGeneralSpot(generalSpots) {
      console.log(generalSpots);
      const totalValueGeneralSpot = generalSpots.reduce(
        (init, current) => init + current.value_used,
        0
      );
      return totalValueGeneralSpot;
    },
    async getLasPreSettelment() {
      const { last_profit } = await strapi.db
        .query("api::generalspot.generalspot")
        .findOne({ select: ["last_profit"], where: { id: 1 } });

      const settlements = await strapi.db
        .query("api::settlement.settlement")
        .findMany({
          where: { profit_id: last_profit },
          populate: true,
        });
      const settlementsReinvest = settlements.filter(
        (settlement) => settlement.is_reinvest === true
      );

      return settlements.map(
        ({
          id,
          investment,
          rate,
          active_days,
          payed_percent,
          is_reinvest,
          spot_id,
          settlement_generated,
          beneficiary,
          is_sell,
          user_id: { username },
          permanence_id: { name },
        }) => ({
          id,
          investment,
          rate,
          beneficiary,
          settlement_generated,
          settelment_total: beneficiary + settlement_generated,
          active_days,
          payed_percent,
          is_reinvest,
          spot_id,
          username,
          name,
          is_sell,
        })
      );
    },
    async totalPreSettelmentReinvestAndWithdrawal() {
      const { last_profit } = await strapi.db
        .query("api::generalspot.generalspot")
        .findOne({ select: ["last_profit"], where: { id: 1 } });

      const settlements = await strapi.db
        .query("api::settlement.settlement")
        .findMany({
          where: { profit_id: last_profit },
          // populate: true,
        });
      const preSettlementsReinvest = settlements.filter(
        (settlement) => settlement.is_reinvest && !settlement.is_sell
      );
      const preSettlementsBonificationWithdrawal = settlements.filter(
        (settlement) => !settlement.is_reinvest && !settlement.is_sell
      );
      const preSettlementsWithdrawal = settlements.filter(
        (settlement) => !settlement.is_reinvest && settlement.is_sell
      );

      const totalPreSettlementsReinvest = preSettlementsReinvest.reduce(
        (acum, value) => acum + value.beneficiary + value.settlement_generated,
        0
      );
      const totalpreSettlementsBonificationWithdrawal =
        preSettlementsBonificationWithdrawal.reduce(
          (acum, value) =>
            acum + value.beneficiary + value.settlement_generated,
          0
        );
      const totalpreSettlementsWithdrawal = preSettlementsWithdrawal.reduce(
        (acum, value) =>
          acum +
          value.investment +
          value.beneficiary +
          value.settlement_generated,
        0
      );
      const totalpreSettlement =
        totalpreSettlementsWithdrawal +
        totalpreSettlementsBonificationWithdrawal +
        totalPreSettlementsReinvest;
      return [
        {
          totalPreSettlementsReinvest,
          totalpreSettlementsBonificationWithdrawal,
          totalpreSettlementsWithdrawal,
          totalpreSettlement,
        },
      ];
    },
    async distributionAverage() {
      const { last_profit } = await strapi.db
        .query("api::generalspot.generalspot")
        .findOne({ select: ["last_profit"], where: { id: 1 } });

      const settlements = await strapi.db
        .query("api::settlement.settlement")
        .findMany({
          where: { profit_id: last_profit },
          populate: true,
        });

      const settlementsMontlhy = settlements
        .filter((spot) => {
          return spot.permanence_id.name === "Monthly";
        })
        .reduce((acum, obj) => acum + obj.settlement_generated, 0);

      const settlementsYear = settlements
        .filter((spot) => {
          return spot.permanence_id.name === "Year";
        })
        .reduce((acum, obj) => acum + obj.settlement_generated, 0);
      const settlementsBeneficiary = settlements.reduce(
        (acum, obj) => acum + obj.beneficiary,
        0
      );

      return {
        settlementsMontlhy,
        settlementsYear,
        settlementsBeneficiary,
        totalSettlement:
          settlementsBeneficiary + settlementsYear + settlementsMontlhy,
      };
    },
    async reduceSettlementByGeneralSpotAndType({
      allGeneralSpots,
      settlements,
      type,
    }) {
      allGeneralSpots.forEach((generalSpot) => {
        const settlementById = settlements
          .filter((settlement) => {
            return (
              settlement.generalspot_id.id === generalSpot.id &&
              settlement.permanence_id.name === type
            );
          })
          .reduce((acum, obj) => acum + obj.settlement_generated, 0);
        generalSpot["settlement"] = settlementById;
      });
      return allGeneralSpots;
    },
    async allTransactionPendingPay() {
      const allTransactionPendingPays = await strapi.db
        .query("api::transaction.transaction")
        .findMany({
          where: { type: "PENDING_PAY" },
          populate: true,
        });

      return allTransactionPendingPays.map(
        ({
          id,
          settlement_total,
          pay_value: value_to_pay,
          address_reciever,
          type,
          spot_id: { id: spot, spot_value },
        }) => ({
          id,
          settlement_total,
          spot_value,
          value_to_pay,
          address_reciever,
          type,
          spot,
        })
      );
    },
    async allTransactionPendingWithDrawal() {
      const allTransactionPendingWithDrawals = await strapi.db
        .query("api::transaction.transaction")
        .findMany({
          where: { type: "PENDING_WITHDRAWAL" },
          populate: true,
        });

      return allTransactionPendingWithDrawals.map(
        ({
          id,
          pay_value: value_to_pay,
          address_reciever,
          type,
          spot_id: { id: spot, spot_value },
        }) => ({
          id,
          spot_value,
          value_to_pay,
          address_reciever,
          type,
          spot,
        })
      );
    },
  })
);
