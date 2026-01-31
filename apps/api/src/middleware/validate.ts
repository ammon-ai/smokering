import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type RequestLocation = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * Validates request data against a Zod schema
 */
export function validate<T extends z.ZodSchema>(
  schema: T,
  location: RequestLocation = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[location];
      const validated = schema.parse(data);
      req[location] = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate multiple locations at once
 */
export function validateRequest<
  TBody extends z.ZodSchema | undefined,
  TQuery extends z.ZodSchema | undefined,
  TParams extends z.ZodSchema | undefined
>(schemas: { body?: TBody; query?: TQuery; params?: TParams }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
