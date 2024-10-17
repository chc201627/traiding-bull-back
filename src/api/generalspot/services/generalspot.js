"use strict";

/**
 * generalspot service.
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::generalspot.generalspot",
  ({ strapi }) => ({
    getGeneralSpot(generalspot_id) {
      return strapi.db.query("api::generalspot.generalspot").findOne({
        select: ["min_value", "max_value"],
        where: { id: generalspot_id },
      });
    },
    async findAndUpdateGeneralSpotValue(generalSpot, value) {
      let found = await strapi.entityService.findOne(
        "api::generalspot.generalspot",
        generalSpot,
        { fields: "value_used" }
      );

      return strapi.entityService.update(
        "api::generalspot.generalspot",
        found.id,
        {
          data: {
            value_used: parseInt(found.value_used) + parseInt(value),
          },
        }
      );
    },
  })
);
