'use strict';

/**
 * historical-profit service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::historical-profit.historical-profit');
