import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

interface PublicPageData {
  about?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SiteIdentity {
  name: string;
  siteName: string;
  description: string;
  logoUrl: string;
  authorNames: string;
  isLoading: boolean;
}

export const usePublicPageData = (): UseQueryResult<PublicPageData> => {
  const { language } = useI18n();
  return useQuery({
    queryKey: ['public-page-data', language],
    queryFn: async () => {
      const res = await api.get('/page-data?resources=about,pages,social-links');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1
  });
};

const stripHtml = (str: string): string => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
};

export const useSiteName = (): string => {
  const { data } = usePublicPageData();
  const about = data?.about;
  return stripHtml(String(about?.name || about?.site_name || 'Portfolio'));
};

export const useSiteIdentity = (): SiteIdentity => {
  const { data, isLoading } = usePublicPageData();
  const about = (data?.about || {}) as Record<string, unknown>;
  return {
    name: stripHtml(String(about.name || 'Portfolio')),
    siteName: stripHtml(String(about.site_name || about.name || 'Portfolio')),
    description: stripHtml(String(about.sub_bio || about.bio_text || '')),
    logoUrl: String(about.logo_url || ''),
    authorNames: stripHtml(String(about.name || 'Portfolio')),
    isLoading
  };
};
