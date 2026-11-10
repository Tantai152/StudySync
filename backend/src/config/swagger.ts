import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerOptions: swaggerJSDoc.OAS3Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudySync API',
      version: '1.0.0',
      description: 'API dành cho ứng dụng học tập cùng nhau StudySync',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API server (Render)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập Access Token sau chữ Bearer (ví dụ: Bearer <token>)',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
