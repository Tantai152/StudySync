import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export const validate = (schema: ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errorCode: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        });
        return;
      }
      next(error);
    }
  };