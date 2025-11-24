import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const createRateLimit = (windowMs?: number, max?: number, skipPaths?: string[]) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimitWindowMs,
    max: max || config.rateLimitMaxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Пропускаем публичные эндпоинты из rate limiting
      if (skipPaths) {
        return skipPaths.some(path => req.path.startsWith(path));
      }
      // По умолчанию пропускаем /uploads и /api/license/verify
      return req.path.startsWith('/uploads') || req.path.startsWith('/api/license/verify');
    }
  });
};

export const licenseVerificationRateLimit = createRateLimit(60000, 300);
export const licenseCreationRateLimit = createRateLimit(300000, 300);
export const generalRateLimit = createRateLimit(undefined, undefined, ['/uploads', '/api/license/verify']);

export const conditionalCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  const allowedOrigins = config.corsAllowedOrigins;

  // Нормализуем origin (убираем слеш в конце, если есть)
  const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;
  
  // Нормализуем список разрешенных origins
  const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));

  // Публичные эндпоинты - /api/license/verify и /uploads открыты для всех доменов
  const publicEndpoints = ['/api/license/verify', '/uploads'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.path.startsWith(endpoint));

  if (isPublicEndpoint) {
    // /api/license/verify и /uploads - полностью открыты для всех доменов
    if (normalizedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // Для /uploads только GET, для /api/license/verify - POST
    if (req.path.startsWith('/uploads')) {
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    } else {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  } else {
    // Для защищенных эндпоинтов - строгая проверка origins
    if (normalizedOrigin && normalizedAllowedOrigins.includes(normalizedOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
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
