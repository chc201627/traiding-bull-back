const crypto = require('crypto');

module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwt: {
        jwtSecret:
          env('JWT_SECRET') || crypto.randomBytes(16).toString('base64'),
      },
    },
  },
});
