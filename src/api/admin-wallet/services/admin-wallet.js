'use strict';

/**
 * admin-wallet service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::admin-wallet.admin-wallet');
