module.exports = ({ env }) => ({
  connection: {
    client: "postgres",
    connection: {
      host: env(
        "DATABASE_HOST",
        "streakbull-dev-rds-test.cmob0yvh3rvv.us-east-2.rds.amazonaws.com"
      ),
      port: env.int("DATABASE_PORT", 5432),
      database: env("DATABASE_NAME", "bull-test"),
      user: env("DATABASE_USERNAME", "postgres"),
      password: env("DATABASE_PASSWORD", "ky6!q*Fk$ZLkWL"),
      ssl: env.bool("DATABASE_SSL", false),
    },
  },
});
