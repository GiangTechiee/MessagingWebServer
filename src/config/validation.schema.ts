import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string()
    .required()
    .pattern(/^postgresql:\/\/.+/i)
    .message('DATABASE_URL must be a valid PostgreSQL connection string'),
  JWT_SECRET: Joi.string().required().min(32),
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  FRONTEND_URL: Joi.string().uri().required().default('http://localhost:3000'),
  BACKEND_URL: Joi.string().uri().required().default('http://localhost:3001'),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
});
