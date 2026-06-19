import { SetMetadata } from '@nestjs/common';

// Décorateur pour marquer une route comme publique (pas d'auth requise)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
