import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class RateLimiterService {
  private attempts = new Map<string, AttemptRecord>();

  // Vérifier si l'IP/numéro est verrouillé
  checkLocked(key: string): void {
    const record = this.attempts.get(key);
    if (!record || !record.lockedUntil) return;

    if (Date.now() < record.lockedUntil) {
      const remainingMs = record.lockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      const remainingSec = Math.ceil((remainingMs % 60000) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Trop de tentatives. Réessayez dans ${remainingMin} min ${remainingSec}s`,
          locked: true,
          retryAfter: remainingMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      // Le verrou est expiré, on reset
      this.attempts.delete(key);
    }
  }

  // Enregistrer une tentative échouée
  recordFailure(key: string): { attemptsLeft: number; locked: boolean } {
    const record = this.attempts.get(key) || { count: 0, lockedUntil: null };
    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCK_DURATION_MS;
      this.attempts.set(key, record);
      return { attemptsLeft: 0, locked: true };
    }

    this.attempts.set(key, record);
    return { attemptsLeft: MAX_ATTEMPTS - record.count, locked: false };
  }

  // Réinitialiser après succès
  reset(key: string): void {
    this.attempts.delete(key);
  }

  // Obtenir l'état (sans throw)
  getStatus(key: string): { attemptsLeft: number; locked: boolean; retryAfterMs: number } {
    const record = this.attempts.get(key);
    if (!record) return { attemptsLeft: MAX_ATTEMPTS, locked: false, retryAfterMs: 0 };

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      return {
        attemptsLeft: 0,
        locked: true,
        retryAfterMs: record.lockedUntil - Date.now(),
      };
    }

    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      this.attempts.delete(key);
      return { attemptsLeft: MAX_ATTEMPTS, locked: false, retryAfterMs: 0 };
    }

    return {
      attemptsLeft: MAX_ATTEMPTS - record.count,
      locked: false,
      retryAfterMs: 0,
    };
  }
}
