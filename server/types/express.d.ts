import { Language } from './api';

declare module 'express-serve-static-core' {
  interface Request {
    language?: Language;
    user?: {
      id: number;
      username: string;
      role?: string;
    };
    translationMetadata?: {
      cached: boolean;
      translationCount: number;
    };
  }
}
