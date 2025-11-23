import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const createRateLimit = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimitWindowMs,
    max: max || config.rateLimitMaxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const licenseVerificationRateLimit = createRateLimit(60000, 300);
export const licenseCreationRateLimit = createRateLimit(300000, 300);
export const generalRateLimit = createRateLimit();

export const conditionalCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  const allowedOrigins = config.corsAllowedOrigins;

  // Публичные эндпоинты (verify, upload) - проверяем разрешенные origins
  const publicEndpoints = ['/verify', '/upload'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.path.endsWith(endpoint));

  if (isPublicEndpoint) {
    // Для публичных эндпоинтов проверяем, что origin в списке разрешенных
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      // Если нет origin (например, прямой запрос), разрешаем
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    } else {
      // Origin не разрешен - не устанавливаем CORS заголовки
      // Запрос будет заблокирован браузером
    }
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  } else {
    // Для защищенных эндпоинтов - строгая проверка origins
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  }
  
  next();
};

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};
