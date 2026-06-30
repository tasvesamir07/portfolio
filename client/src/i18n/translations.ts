import type { LanguageCode } from '../types';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', shortLabel: 'EN' },
  { code: 'bn', label: 'Bangla', nativeLabel: 'বাংলা', shortLabel: 'বাং' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', shortLabel: 'KO' }
];
