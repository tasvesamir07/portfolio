import React from 'react';
import Projects from '../components/Projects';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ProjectsPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.projects')} | ${siteName}`}
                description={`Current research projects and funded grants by ${siteName}.`}
            />
            <Projects />
        </div>
    );
};

export default ProjectsPage;
