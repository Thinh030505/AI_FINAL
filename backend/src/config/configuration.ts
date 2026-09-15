export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ocr_ai',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_ocr_ai_key_2026_jwt',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB, 10) || 10,
});
