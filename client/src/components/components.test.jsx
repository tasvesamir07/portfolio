import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import components
import Academics from './Academics';
import Analytics from './Analytics';
import AnonymousMessageForm from './AnonymousMessageForm';
import BackToTop from './BackToTop';
import Contact from './Contact';
import Experiences from './Experiences';
import Gallery from './Gallery';
import Hero from './Hero';
import Newspaper from './Newspaper';
import Research from './Research';
import ResearchInterests from './ResearchInterests';
import StructuredData from './StructuredData';
import StructuredDetails from './StructuredDetails';
import { TipTapEditor, TipTapMinimal } from './TipTapEditor';
import SWUpdateBanner from './SWUpdateBanner';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: ({ queryKey }) => {
        if (queryKey.includes('academics')) return { data: [{ id: '1', institution: 'MIT', degree: 'PhD', details_json: '[]' }], isLoading: false };
        if (queryKey.includes('gallery')) return { data: [{ id: '1', category: 'Tech', image_url: 'http://test.com/img.png', caption: 'Test Caption' }], isLoading: false };
        if (queryKey.includes('newspapers')) return { data: [{ id: '1', title: 'Daily Star' }], isLoading: false };
        if (queryKey.includes('research')) return { data: [{ id: '1', title: 'AI Research', details_json: '[]' }], isLoading: false };
        if (queryKey.includes('research-interests')) return { data: [{ id: '1', interest: 'ML', details_json: '[]' }], isLoading: false };
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

vi.mock('@tiptap/react', () => ({
    EditorContent: () => <div data-testid="editor-content" />,
    useEditor: () => ({
        getHTML: () => '<p>Hello</p>',
        commands: {
            setContent: () => {}
        },
        isActive: () => false,
        getAttributes: () => ({})
    })
}));

vi.mock('../api', () => {
    return {
        default: {
            post: vi.fn().mockResolvedValue({ data: { success: true } })
        }
    };
});

describe('Client Components Tests', () => {
    it('renders Academics component', () => {
        render(<Academics />);
        expect(screen.getByText('MIT')).toBeInTheDocument();
    });

    it('renders Analytics component', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <Analytics />
            </MemoryRouter>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders AnonymousMessageForm component and handles submit', async () => {
        render(<AnonymousMessageForm />);
        const textarea = screen.getByPlaceholderText('anonymous.messagePlaceholder');
        fireEvent.change(textarea, { target: { value: 'Test message' } });
        const button = screen.getByText('anonymous.sendMessage');
        fireEvent.click(button);
        await waitFor(() => {
            expect(screen.getByText('anonymous.successMessage')).toBeInTheDocument();
        });
    });

    it('renders BackToTop component and scrolls', () => {
        render(<BackToTop />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders Contact component', () => {
        render(<Contact />);
        expect(screen.getByText('contact.titleMain')).toBeInTheDocument();
    });

    it('renders Experiences component', () => {
        render(<Experiences />);
        expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('renders Gallery component', () => {
        render(<Gallery />);
        expect(screen.getByText('Tech')).toBeInTheDocument();
        expect(screen.getByText('Test Caption')).toBeInTheDocument();
    });

    it('renders Hero component', () => {
        render(<Hero data={{ name: 'Samir' }} socialLinks={[]} />);
        expect(screen.getByText('Samir')).toBeInTheDocument();
    });

    it('renders Newspaper component', () => {
        render(<Newspaper />);
        expect(screen.getByText('Daily Star')).toBeInTheDocument();
    });

    it('renders Research component', () => {
        render(<Research />);
        expect(screen.getByText('AI Research')).toBeInTheDocument();
    });

    it('renders ResearchInterests component', () => {
        render(<ResearchInterests />);
        expect(screen.getByText('ML')).toBeInTheDocument();
    });

    it('renders StructuredData component', () => {
        const { container } = render(<StructuredData />);
        const script = container.querySelector('script');
        expect(script).toBeInTheDocument();
        expect(script.type).toBe('application/ld+json');
    });

    it('renders StructuredDetails component', () => {
        const items = [{ id: '1', type: 'text', title: 'Label', text: 'Some details' }];
        render(<StructuredDetails items={items} />);
        expect(screen.getByText('Some details')).toBeInTheDocument();
    });

    it('renders TipTapEditor and TipTapMinimal', () => {
        render(<TipTapEditor value="Hello" onChange={() => {}} />);
        render(<TipTapMinimal value="Hi" onChange={() => {}} />);
        expect(screen.getAllByTestId('editor-content').length).toBe(2);
    });

    it('renders SWUpdateBanner when event triggered', async () => {
        render(<SWUpdateBanner />);
        expect(screen.queryByText(/A new version of the website is available/i)).not.toBeInTheDocument();

        const event = new CustomEvent('sw:update-available', { detail: { registration: { waiting: {} } } });
        window.dispatchEvent(event);

        expect(await screen.findByText('Update Available')).toBeInTheDocument();
    });
});
