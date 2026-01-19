import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  API_PORT: Joi.number().default(3001),
  API_HOST: Joi.string().default('0.0.0.0'),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  REDIS_URL: Joi.string().allow('', null),
  ANTHROPIC_API_KEY: Joi.string().allow('', null),
  GOOGLE_CALENDAR_CLIENT_EMAIL: Joi.string().allow('', null),
  GOOGLE_CALENDAR_PRIVATE_KEY: Joi.string().allow('', null),
});
