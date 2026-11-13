import swaggerJSDoc from 'swagger-jsdoc';

// Sử dụng process.cwd() để lấy thư mục gốc của project (không phụ thuộc __dirname)
const isProd = process.env.NODE_ENV === 'production';

const apis = isProd
  ? [
      './dist/routes/*.js',
      './dist/controllers/*.js',
    ]
  : [
      './src/routes/*.ts',
      './src/controllers/*.ts',
    ];

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
  apis,
};
