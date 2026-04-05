const path = require("path");

const requiredEnvKeys = ["PG_USER", "PG_PWD", "PG_DATABASE", "PG_HOST", "PG_PORT"];
if (requiredEnvKeys.some((key) => !process.env[key])) {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}

const base = {
  username: process.env.PG_USER,
  password: process.env.PG_PWD,
  database: process.env.PG_DATABASE,
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 5432),
  dialect: "postgres",
};

module.exports = {
  development: { ...base, logging: false},
  test: { ...base, logging: false },
  production: { ...base, logging: false },
};
