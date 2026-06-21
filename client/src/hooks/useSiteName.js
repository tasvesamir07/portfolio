import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

export const usePublicPageData = () => {
    const { language } = useI18n();
    return useQuery({
        queryKey: ['public-page-data', language],
        queryFn: async () => {
            const res = await api.get('/page-data?resources=about,pages,social-links');
            return res.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000,
        retry: 1
    });
};

export const useSiteName = () => {
    const { data } = usePublicPageData();
    const about = data?.about;
    return about?.name || about?.site_name || 'Portfolio';
};

export const useSiteIdentity = () => {
    const { data, isLoading } = usePublicPageData();
    const about = data?.about || {};
    return {
        name: about.name || 'Portfolio',
        siteName: about.site_name || about.name || 'Portfolio',
        description: about.bio_short || '',
        logoUrl: about.logo_url || '',
        authorNames: about.author_names || about.name || 'Portfolio',
        isLoading
    };
};
