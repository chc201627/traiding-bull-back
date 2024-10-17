'use strict';

/**
 * rate service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::rate.rate', ({ strapi }) => ({
  async getRatebyType(id) {
    const rates = await strapi.db
      .query('api::rate.rate')
      .findOne({ where: { id: 1 } });
    let rate = 0;
    switch (id) {
      case 1:
        rate = rates.monthly_rate;
        break;
      case 2:
        rate = rates.yearly_rate;
        break;
      default:
        rate = rates.beneficiary_rate;
        break;
    }
    return rate;
  },
  async getProfitRate() {
    return strapi.db
      .query('api::rate.rate')
      .findOne({ where: { id: 1 }, select: ['company', 'broker'] });
  },
}));
