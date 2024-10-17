'use strict';

/**
 * session-history service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::session-history.session-history');
