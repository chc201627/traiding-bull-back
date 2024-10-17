'use strict';

/**
 * permanence service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::permanence.permanence');
