import { useQuery } from '@tanstack/react-query';
import api from '../api';

export const useSiteName = () => {
    const { data: siteName = 'Portfolio' } = useQuery({
        queryKey: ['site-name'],
        queryFn: async () => {
            const res = await api.get('/page-data?resources=about');
            const about = res.data?.about;
            return about?.name || about?.site_name || 'Portfolio';
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1
    });

    return siteName;
};

export const useSiteIdentity = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['site-identity'],
        queryFn: async () => {
            const res = await api.get('/page-data?resources=about');
            const about = res.data?.about || {};
            return {
                name: about.name || 'Portfolio',
                siteName: about.site_name || about.name || 'Portfolio',
                description: about.bio_short || '',
                logoUrl: about.logo_url || '',
                authorNames: about.author_names || about.name || 'Portfolio'
            };
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1
    });

    return {
        name: data?.name || 'Portfolio',
        siteName: data?.siteName || 'Portfolio',
        description: data?.description || '',
        logoUrl: data?.logoUrl || '',
        authorNames: data?.authorNames || 'Portfolio',
        isLoading
    };
};
