/**
 * Sequelize Database Configuration
 * Handles database connection setup and exports sequelize instance
 */

import { Sequelize } from 'sequelize';

const cleanEnv = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const sequelize = new Sequelize(
  cleanEnv(process.env.PG_DATABASE),
  cleanEnv(process.env.PG_USER),
  cleanEnv(process.env.PG_PWD),
  {
    host: cleanEnv(process.env.PG_HOST, 'localhost'),
    port: Number(cleanEnv(process.env.PG_PORT, '5432')),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testConnection();

export default sequelize;
