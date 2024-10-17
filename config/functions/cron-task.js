const blockchain = require("../../src/utils/blockchain/index");

module.exports = {
  "0 0 0 * * *": async ({ strapi }) => {
    try {
      const usersWithEnergy = await strapi.db
        .query("plugin::users-permissions.user")
        .findMany({
          where: { has_delegated_energy: true },
        });

      await Promise.allSettled(
        usersWithEnergy.map(async (u) => {
          await blockchain.takeEnergy(u.username);
          await strapi.db.query("plugin::users-permissions.user").update({
            where: { id: u.id },
            data: {
              hasDelegatedEnergy: false,
            },
          });
          console.log(u.username + " settled");
          return true;
        })
      );
    } catch (error) {
      console.log(error);
    }
  },

  /**
   * Simple example.
   * Every monday at 1am.
   */

  " * */10 * * *": async ({ strapi }) => {
    try {
      const ActivaDate = new Date();
      await strapi.db.query("api::spot.spot").updateMany({
        where: {
          enabled_before_at: { $lte: ActivaDate },
          status: "ACQUIRED",
          // is_reinvest: false,
        },
        data: {
          status: "ACTIVE",
        },
      });
    } catch (error) {
      console.log(error);
    }

    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  },

  // "* */15 * * *": async ({ strapi }) => {
  //   try {
  //     const ActivaDate = new Date();

  //     await strapi.db.query("api::spot.spot").updateMany({
  //       where: {
  //         enabled_before_at: { $lte: ActivaDate },
  //         status: "ACTIVE",
  //         is_reinvest: false,
  //       },
  //       data: {
  //         is_reinvest: true,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  // },
  "* */23 * * *": async ({ strapi }) => {
    try {
      let today = new Date();
      let offDate = new Date(today);
      const ActivaDate = new Date();
      const { date_expiration_beneficiary } = await strapi.db
        .query("api::configuration.configuration")
        .findOne({
          select: ["date_expiration_beneficiary"],
        });
      await strapi.db.query("api::spot.spot").updateMany({
        where: {
          enabled_before_at: { $lte: ActivaDate },
          status: "ACTIVE",
          off_date: {
            $null: true,
          },
        },
        data: {
          off_date: offDate.setDate(
            today.getDate() + date_expiration_beneficiary
          ),
        },
      });
    } catch (error) {
      console.log(error);
    }

    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  },
  "0 0 0 28  * *": async ({ strapi }) => {
    try {
      console.log("Entrando a generalspot");
      await strapi.db.query("api::generalspot.generalspot").updateMany({
        where: {
          settelment_status: true,
        },
        data: {
          settelment_status: false,
        },
      });
    } catch (error) {
      console.log(error);
    }

    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  },
};
