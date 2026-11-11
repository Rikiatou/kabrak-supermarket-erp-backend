import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

// Le mini-PC ne garde que les 200 premiers caractères de la réponse dans son syncLog :
// on renvoie donc la vraie raison (code Prisma, champs en conflit, id de l'élément) en tête,
// et on journalise le détail complet côté cloud (logs Railway).
const PRISMA_STATUS: Record<string, number> = {
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.UNPROCESSABLE_ENTITY,
  P2025: HttpStatus.NOT_FOUND,
  P2000: HttpStatus.UNPROCESSABLE_ENTITY,
  P2006: HttpStatus.UNPROCESSABLE_ENTITY,
  P2011: HttpStatus.UNPROCESSABLE_ENTITY,
};

function describe(e: unknown): { status: number; message: string } {
  if (e instanceof HttpException) {
    const r = e.getResponse();
    const message = typeof r === 'string' ? r : (r as any)?.message ?? e.message;
    return { status: e.getStatus(), message: Array.isArray(message) ? message.join('; ') : String(message) };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = e.meta as Record<string, unknown> | undefined;
    const target = meta?.target ?? meta?.field_name ?? meta?.cause;
    const firstLine = e.message.split('\n').filter((l) => l.trim()).pop() ?? '';
    return {
      status: PRISMA_STATUS[e.code] ?? HttpStatus.INTERNAL_SERVER_ERROR,
      message: `${e.code}${target ? ` ${JSON.stringify(target)}` : ''}: ${firstLine.trim()}`,
    };
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    const lines = e.message.split('\n').map((l) => l.trim()).filter(Boolean);
    return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: `Validation: ${lines[lines.length - 1] ?? 'invalid data'}` };
  }
  const err = e as any;
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 600) {
    return { status: err.status, message: err.message ?? 'Error' };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: err?.message ?? String(e) };
}

@Catch()
export class CloudSyncExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { status, message } = describe(exception);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ref = [body.id && `id=${body.id}`, body.sku && `sku=${body.sku}`, body.barcode && `barcode=${body.barcode}`,
      body.transactionNumber && `tx=${body.transactionNumber}`, body.tenantId !== undefined && `tenant=${body.tenantId ?? 'null'}`]
      .filter(Boolean).join(' ');
    const text = `${message}${ref ? ` [${ref}]` : ''}`;
    if (status >= 500 || status === HttpStatus.CONFLICT || status === HttpStatus.UNPROCESSABLE_ENTITY) {
      console.error(`❌ cloud-sync ${req.method} ${req.path} → ${status} ${text}`);
      if (status >= 500 && (exception as any)?.stack) console.error((exception as any).stack);
    }
    res.status(status).json({ statusCode: status, message: text.slice(0, 400), path: req.path });
  }
}
