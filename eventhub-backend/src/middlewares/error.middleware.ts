import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Fallback for non-AppError exceptions based on common message patterns
  if (!err.statusCode && typeof message === 'string') {
    if (message.includes('not found') || message.includes('Not found')) {
      statusCode = 404;
    } else if (message.startsWith('Forbidden:') || message.includes('Forbidden')) {
      statusCode = 403;
    } else if (message.startsWith('Conflict:') || message.includes('already registered') || message.includes('Conflict')) {
      statusCode = 409;
    } else if (message.startsWith('Unauthorized:') || message.includes('Invalid email or password')) {
      statusCode = 401;
    }
  }

  // Prevent stack traces from leaking in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
