export type Language = 'en' | 'bn' | 'ko';

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface TranslationResult {
  text: string;
  fromCache: boolean;
}

export interface BatchTranslationResult {
  texts: string[];
  fromCache: boolean;
}
