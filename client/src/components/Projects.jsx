import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Code, ExternalLink } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const { language, t } = useI18n();
    const translatedProjects = useTranslatedDataRows(projects, ['title', 'description', 'tech_stack'], language);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setProjects(res.data);
            } catch (err) {
                console.error('Error fetching projects:', err);
            }
        };
        fetchProjects();
    }, [language]);

    return (
        <section id="projects" className="py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center">{t('projects.kicker')}</span>
                <h2 className="text-5xl md:text-7xl font-bold text-center mb-16 text-gray-900 tracking-tight">{t('projects.titleMain')} <span className="text-brand-gold">{t('projects.titleAccent')}</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {translatedProjects.map((project, index) => {
                        const title = getLocalizedField(project, 'title', language, project.title);
                        const description = getLocalizedField(project, 'description', language, project.description);
                        const techStack = getLocalizedField(project, 'tech_stack', language, project.tech_stack || '');

                        return (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white rounded-3xl p-8 border-2 border-gray-100 hover:border-brand-blue/80/50 transition-all group shadow-xl shadow-gray-200/20 hover:-translate-y-2"
                        >
                            {project.image_url && (
                                <div className="mb-6 rounded-2xl overflow-hidden aspect-video border border-gray-100 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                                    <img src={project.image_url} alt={title} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-brand-blue/5 rounded-xl flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors flex-shrink-0">
                                    <Code size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-brand-blue transition-colors uppercase">{title}</h3>
                            </div>
                            <p className="text-gray-500 mb-8 font-medium leading-relaxed line-clamp-3">{description}</p>
                            <div className="flex flex-wrap gap-2 mb-10">
                                {techStack.split(',').map((tech, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                        {tech.trim()}
                                    </span>
                                ))}
                            </div>
                            <a 
                                href={project.link || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-gray-900 hover:text-brand-blue transition-all group-hover:translate-x-2"
                            >
                                {t('projects.viewProject')} <ExternalLink size={14} />
                            </a>
                        </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Projects;
