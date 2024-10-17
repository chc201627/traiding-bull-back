"use strict";

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require("crypto");
const _ = require("lodash");
const utils = require("@strapi/utils");
const { getService } = require("@strapi/plugin-users-permissions/server/utils");
const {
  validateCallbackBody,
  validateRegisterBody,
  validateSendEmailConfirmationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateEmailConfirmationBody,
  validateChangePasswordBody,
  validateCallbackAdminBody,
} = require("./validation/auth");
const { signatureValidation } = require("../../../../utils/blockchain");

const { getAbsoluteAdminUrl, getAbsoluteServerUrl, sanitize } = utils;
const { ApplicationError, ValidationError } = utils.errors;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel("plugin::users-permissions.user");

  return sanitize.contentAPI.output(user, userSchema, { auth });
};

module.exports = {
  async callback(ctx) {
    const provider = ctx.params.provider || "local";
    const params = ctx.request.body;

    const store = strapi.store({ type: "plugin", name: "users-permissions" });
    const grantSettings = await store.get({ key: "grant" });

    const grantProvider = provider === "local" ? "email" : provider;

    // if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
    //   throw new ApplicationError('This provider is disabled');
    // }

    if (provider === "local") {
      await validateCallbackBody(params);

      const { address } = params;
      // console.log(address);
      console.log(JSON.stringify(params));
      // Check if the user exists.
      const user = await strapi
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            provider,
            $or: [
              // { email: identifier.toLowerCase() },
              { username: address },
            ],
          },
          populate: { role: true },
        });

      if (!user) {
        throw new ValidationError("Invalid identifier or password");
      }

      // if (!user.password) {
      //   throw new ValidationError('Invalid identifier or password');
      // }

      // const validPassword = await getService('user').validatePassword(
      //   params.password,
      //   user.password
      // );

      const signature = {
        address: ctx.request.body.address,
        deadline: ctx.request.body.deadline,
      };

      const signatureValid = await signatureValidation(
        ctx.request.body.signature,
        JSON.stringify(signature),
        signature.address,
        signature.deadline
      );

      if (!signatureValid) {
        throw new ApplicationError("The signature is not valid");
      }

      // if (!validPassword) {
      //   throw new ValidationError('Invalid identifier or password');
      // }

      // const advancedSettings = await store.get({ key: 'advanced' });
      // const requiresConfirmation = _.get(
      //   advancedSettings,
      //   'email_confirmation'
      // );

      // if (requiresConfirmation && user.confirmed !== true) {
      //   throw new ApplicationError('Your account email is not confirmed');
      // }

      if (user.blocked === true) {
        throw new ApplicationError(
          "Your account has been blocked by an administrator"
        );
      }

      return ctx.send({
        jwt: getService("jwt").issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
        role: await sanitizeUser(user.role, ctx),
      });
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService("providers").connect(provider, ctx.query);

      return ctx.send({
        jwt: getService("jwt").issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  async callbackAdmin(ctx) {
    const provider = ctx.params.provider || "local";
    const params = ctx.request.body;

    const store = strapi.store({ type: "plugin", name: "users-permissions" });
    const grantSettings = await store.get({ key: "grant" });

    const grantProvider = provider === "local" ? "email" : provider;

    if (provider === "local") {
      await validateCallbackAdminBody(params);

      const { username } = params;

      // Check if the user exists.
      const user = await strapi
        .query("plugin::users-permissions.user")
        .findOne({
          where: { username: username },
          populate: { role: true },
        });
      if (!user) {
        throw new ValidationError("Invalid identifier or password");
      }

      if (user.role.id !== 3) {
        throw new ValidationError("Invalid Role");
      }

      if (!user.password) {
        throw new ValidationError("Invalid identifier or password");
      }

      const validPassword = await getService("user").validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError("Invalid identifier or password");
      }
      if (user.blocked === true) {
        throw new ApplicationError(
          "Your account has been blocked by an administrator"
        );
      }

      return ctx.send({
        jwt: getService("jwt").issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
        role: await sanitizeUser(user.role, ctx),
      });
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService("providers").connect(provider, ctx.query);

      return ctx.send({
        jwt: getService("jwt").issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  async changePassword(ctx) {
    if (!ctx.state.user) {
      throw new ApplicationError(
        "You must be authenticated to reset your password"
      );
    }

    const { currentPassword, password } = await validateChangePasswordBody(
      ctx.request.body
    );

    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id
    );

    const validPassword = await getService("user").validatePassword(
      currentPassword,
      user.password
    );

    if (!validPassword) {
      throw new ValidationError("The provided current password is invalid");
    }

    if (currentPassword === password) {
      throw new ValidationError(
        "Your new password must be different than your current password"
      );
    }

    await getService("user").edit(user.id, { password });

    ctx.send({
      jwt: getService("jwt").issue({ id: user.id }),
      user: await sanitizeUser(user, ctx),
    });
  },

  async resetPassword(ctx) {
    const { password, passwordConfirmation, code } =
      await validateResetPasswordBody(ctx.request.body);

    if (password !== passwordConfirmation) {
      throw new ValidationError("Passwords do not match");
    }

    const user = await strapi
      .query("plugin::users-permissions.user")
      .findOne({ where: { resetPasswordToken: code } });

    if (!user) {
      throw new ValidationError("Incorrect code provided");
    }

    await getService("user").edit(user.id, {
      resetPasswordToken: null,
      password,
    });

    // Update the user.
    ctx.send({
      jwt: getService("jwt").issue({ id: user.id }),
      user: await sanitizeUser(user, ctx),
    });
  },

  async connect(ctx, next) {
    const grant = require("grant-koa");

    const providers = await strapi
      .store({ type: "plugin", name: "users-permissions", key: "grant" })
      .get();

    const apiPrefix = strapi.config.get("api.rest.prefix");
    const grantConfig = {
      defaults: {
        prefix: `${apiPrefix}/connect`,
      },
      ...providers,
    };

    const [requestPath] = ctx.request.url.split("?");
    const provider = requestPath.split("/connect/")[1].split("/")[0];

    if (!_.get(grantConfig[provider], "enabled")) {
      throw new ApplicationError("This provider is disabled");
    }

    if (!strapi.config.server.url.startsWith("http")) {
      strapi.log.warn(
        "You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url"
      );
    }

    // Ability to pass OAuth callback dynamically
    grantConfig[provider].callback =
      _.get(ctx, "query.callback") ||
      _.get(ctx, "session.grant.dynamic.callback") ||
      grantConfig[provider].callback;
    grantConfig[provider].redirect_uri =
      getService("providers").buildRedirectUri(provider);

    return grant(grantConfig)(ctx, next);
  },

  async forgotPassword(ctx) {
    const { email } = await validateForgotPasswordBody(ctx.request.body);

    const pluginStore = await strapi.store({
      type: "plugin",
      name: "users-permissions",
    });

    const emailSettings = await pluginStore.get({ key: "email" });
    const advancedSettings = await pluginStore.get({ key: "advanced" });

    // Find the user by email.
    const user = await strapi
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.blocked) {
      return ctx.send({ ok: true });
    }

    // Generate random token.
    const userInfo = await sanitizeUser(user, ctx);

    const resetPasswordToken = crypto.randomBytes(64).toString("hex");

    const resetPasswordSettings = _.get(
      emailSettings,
      "reset_password.options",
      {}
    );
    const emailBody = await getService("users-permissions").template(
      resetPasswordSettings.message,
      {
        URL: advancedSettings.email_reset_password,
        SERVER_URL: getAbsoluteServerUrl(strapi.config),
        ADMIN_URL: getAbsoluteAdminUrl(strapi.config),
        USER: userInfo,
        TOKEN: resetPasswordToken,
      }
    );

    const emailObject = await getService("users-permissions").template(
      resetPasswordSettings.object,
      {
        USER: userInfo,
      }
    );

    const emailToSend = {
      to: user.email,
      from:
        resetPasswordSettings.from.email || resetPasswordSettings.from.name
          ? `${resetPasswordSettings.from.name} <${resetPasswordSettings.from.email}>`
          : undefined,
      replyTo: resetPasswordSettings.response_email,
      subject: emailObject,
      text: emailBody,
      html: emailBody,
    };

    // NOTE: Update the user before sending the email so an Admin can generate the link if the email fails
    await getService("user").edit(user.id, { resetPasswordToken });

    // Send an email to the user.
    await strapi.plugin("email").service("email").send(emailToSend);

    ctx.send({ ok: true });
  },

  async register(ctx) {
    const pluginStore = await strapi.store({
      type: "plugin",
      name: "users-permissions",
    });

    const settings = await pluginStore.get({ key: "advanced" });

    if (!settings.allow_register) {
      throw new ApplicationError("Register action is currently disabled");
    }

    const params = {
      ..._.omit(ctx.request.body, [
        "confirmed",
        "blocked",
        "confirmationToken",
        "resetPasswordToken",
        "provider",
      ]),
      provider: "local",
    };

    await validateRegisterBody(params);

    const signValue = {
      referralCode: ctx.request.body.referralCode,
      address: ctx.request.body.address,
      deadline: ctx.request.body.deadline,
    };
    // console.log(signValue);
    const signValidation = await signatureValidation(
      ctx.request.body.signature,
      JSON.stringify(signValue),
      signValue.address,
      signValue.deadline
    );
    if (!signValidation) {
      throw new ApplicationError("The signature is not valid.!");
    }

    const role = await strapi
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      throw new ApplicationError("Impossible to find the default role");
    }

    const { provider, referralCode } = params;

    const referral = await strapi
      .query("api::referral-code.referral-code")
      .findOne({
        where: { code: referralCode },
        populate: { status_id: true },
      });

    if (!referral) {
      throw new ApplicationError("Imposible to find the referral code");
    }
    if (referral.status_id.id !== 2) {
      throw new ApplicationError("Referal code alredy use");
    }

    const identifierFilter = {
      $or: [
        //{ email: email.toLowerCase() },
        //{ username: email.toLowerCase() },
        { username: params.address },
        //{ email: username },
      ],
    };

    const conflictingUserCount = await strapi
      .query("plugin::users-permissions.user")
      .count({
        where: { ...identifierFilter, provider },
      });

    if (conflictingUserCount > 0) {
      throw new ApplicationError("Email or Username are already taken");
    }

    if (settings.unique_email) {
      const conflictingUserCount = await strapi
        .query("plugin::users-permissions.user")
        .count({
          where: { ...identifierFilter },
        });

      if (conflictingUserCount > 0) {
        throw new ApplicationError("Email or Username are already taken");
      }
    }

    let newUser = {
      ...params,
      role: role.id,
      //email: email.toLowerCase(),
      username: params.address,
      confirmed: !settings.email_confirmation,
    };

    const user = await getService("user").add(newUser);

    const refCode = await strapi.db
      .query("api::referral-code.referral-code")
      .update({
        where: { id: referral.id },
        data: {
          status_id: 3,
          users_refer_id: user.id,
        },
      });

    const sanitizedUser = await sanitizeUser(user, ctx);

    if (settings.email_confirmation) {
      try {
        await getService("user").sendConfirmationEmail(sanitizedUser);
      } catch (err) {
        throw new ApplicationError(err.message);
      }

      return ctx.send({ user: { ...sanitizedUser, role: role.name } });
    }

    const jwt = getService("jwt").issue(_.pick(user, ["id"]));

    return ctx.send({
      jwt,
      user: sanitizedUser,
      role: await sanitizeUser(role, ctx),
    });
  },

  async emailConfirmation(ctx, next, returnUser) {
    const { confirmation: confirmationToken } =
      await validateEmailConfirmationBody(ctx.query);

    const userService = getService("user");
    const jwtService = getService("jwt");

    const [user] = await userService.fetchAll({
      filters: { confirmationToken },
    });

    if (!user) {
      throw new ValidationError("Invalid token");
    }

    await userService.edit(user.id, {
      confirmed: true,
      confirmationToken: null,
    });

    if (returnUser) {
      ctx.send({
        jwt: jwtService.issue({ id: user.id }),
        user: await sanitizeUser(user, ctx),
      });
    } else {
      const settings = await strapi
        .store({ type: "plugin", name: "users-permissions", key: "advanced" })
        .get();

      ctx.redirect(settings.email_confirmation_redirection || "/");
    }
  },

  async sendEmailConfirmation(ctx) {
    const { email } = await validateSendEmailConfirmationBody(ctx.request.body);

    const user = await strapi.query("plugin::users-permissions.user").findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return ctx.send({ email, sent: true });
    }

    if (user.confirmed) {
      throw new ApplicationError("Already confirmed");
    }

    if (user.blocked) {
      throw new ApplicationError("User blocked");
    }

    await getService("user").sendConfirmationEmail(user);

    ctx.send({
      email: user.email,
      sent: true,
    });
  },
};
