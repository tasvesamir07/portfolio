import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import pages
import AcademicsPage from './AcademicsPage';
import AnonymousMessagePage from './AnonymousMessagePage';
import ContactPage from './ContactPage';
import DynamicPage from './DynamicPage';
import ExperiencesPage from './ExperiencesPage';
import GalleryPage from './GalleryPage';
import Home from './Home';
import NewspaperPage from './NewspaperPage';
import NotFound from './NotFound';
import PublicationsPage from './PublicationsPage';
import ResearchInterestsPage from './ResearchInterestsPage';

// Mock SEO component
vi.mock('../hooks/useSeo', () => ({
    default: () => <div data-testid="seo-element" />
}));

// Mock react-router-dom useParams
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useParams: () => ({ slug: 'my-test-slug' })
    };
});

// Mock hooks
vi.mock('../i18n/I18nContext', () => ({
    useI18n: () => ({
        language: 'en',
        t: (key) => key
    })
}));

vi.mock('../hooks/useSiteName', () => ({
    useSiteName: () => 'Samir',
    useSiteIdentity: () => ({ authorNames: ['Samir'] }),
    usePublicPageData: () => ({
        data: {
            socialLinks: [{ id: '1', platform: 'GitHub', url: 'https://github.com' }],
            about: { name: 'Samir', site_name: 'Samir', sub_bio: 'Hello' }
        }
    })
}));

// Mock Query Client / useQuery
vi.mock('@tanstack/react-query', () => ({
    useQuery: ({ queryKey }) => {
        if (queryKey.includes('academics')) return { data: [{ id: '1', institution: 'MIT', degree: 'PhD', details_json: '[]' }], isLoading: false };
        if (queryKey.includes('gallery')) return { data: [{ id: '1', category: 'Tech', image_url: 'http://test.com/img.png', caption: 'Test Caption' }], isLoading: false };
        if (queryKey.includes('newspapers')) return { data: [{ id: '1', title: 'Daily Star' }], isLoading: false };
        if (queryKey.includes('research-interests')) return { data: [{ id: '1', interest: 'ML', details_json: '[]' }], isLoading: false };
        if (queryKey.includes('blog')) return { data: { title: 'Blog Post Title', details_json: '[]', content: 'Test blog content' }, isLoading: false };
        if (queryKey.includes('publications')) return { data: [{ id: '1', title: 'Paper Title', doi_url: 'http://doi.org', pub_year: '2023', journal_name: 'IEEE' }], isLoading: false };
        if (queryKey.includes('page-data')) {
            return {
                data: {
                    experiences: [{ id: '1', company: 'Google', position: 'SWE', details_json: '[]' }],
                    trainings: [{ id: '1', title: 'Deep Learning', instructor: 'Coursera' }],
                    skills: [{ id: '1', category: 'Backend', items: 'Node.js' }]
                },
                isLoading: false
            };
        }
        return { data: [], isLoading: false };
    }
}));

// Mock Framer Motion with proxy to dynamically resolve html elements
vi.mock('framer-motion', () => {
    const motionProxy = new Proxy(
        {},
        {
            get: (target, prop) => {
                return ({ children, ...props }) => {
                    const validProps = {};
                    for (const key in props) {
                        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileInView', 'viewport'].includes(key)) {
                            validProps[key] = props[key];
                        }
                    }
                    return React.createElement(prop, validProps, children);
                };
            }
        }
    );
    return {
        motion: motionProxy,
        AnimatePresence: ({ children }) => <>{children}</>
    };
});

// Helper to wrap pages in router
const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('Client Pages Tests', () => {
    it('renders AcademicsPage', () => {
        renderWithRouter(<AcademicsPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('MIT')).toBeInTheDocument();
    });

    it('renders AnonymousMessagePage', () => {
        renderWithRouter(<AnonymousMessagePage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('anonymous.sendMessage')).toBeInTheDocument();
    });

    it('renders ContactPage', () => {
        renderWithRouter(<ContactPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('contact.titleMain')).toBeInTheDocument();
    });

    it('renders DynamicPage', () => {
        renderWithRouter(<DynamicPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Blog Post Title')).toBeInTheDocument();
    });

    it('renders ExperiencesPage', () => {
        renderWithRouter(<ExperiencesPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('renders GalleryPage', () => {
        renderWithRouter(<GalleryPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('renders Home', () => {
        renderWithRouter(<Home />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Samir')).toBeInTheDocument();
    });

    it('renders NewspaperPage', () => {
        renderWithRouter(<NewspaperPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Daily Star')).toBeInTheDocument();
    });

    it('renders NotFound', () => {
        renderWithRouter(<NotFound />);
        expect(screen.getByText('error.pageNotFound')).toBeInTheDocument();
    });

    it('renders PublicationsPage', () => {
        renderWithRouter(<PublicationsPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('Paper Title')).toBeInTheDocument();
    });

    it('renders ResearchInterestsPage', () => {
        renderWithRouter(<ResearchInterestsPage />);
        expect(screen.getByTestId('seo-element')).toBeInTheDocument();
        expect(screen.getByText('ML')).toBeInTheDocument();
    });
});
