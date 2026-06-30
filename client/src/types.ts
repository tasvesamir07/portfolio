export type LanguageCode = 'en' | 'bn' | 'ko';

export interface Language {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

export type SiteAlertType = 'info' | 'success' | 'error' | 'warning';

export interface SiteAlertDetail {
  title?: string;
  message?: string;
  type?: SiteAlertType;
  duration?: number;
}

export type StructuredItemType = 'pair' | 'title' | 'text';

export interface StructuredItem {
  id: string;
  type: StructuredItemType;
  title: string;
  values: string[];
  text: string;
}

export interface HighlightItem {
  kind?: 'pair' | 'text';
  label?: string;
  text: string;
  textHtml?: string;
  valueHtmls?: string[];
  linkedValues: string[];
}

export interface BioBlock {
  type: 'paragraph' | 'ul' | 'ol';
  text?: string;
  items?: string[];
}

export interface ContactValue {
  html: string;
  text: string;
}
