import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { licenseKey?: string }, res: Response, next: NextFunction) {
    req.licenseKey = (req.headers['x-license-key'] as string) || undefined;
    next();
  }
}
