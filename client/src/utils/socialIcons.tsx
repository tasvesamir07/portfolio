import React, { type SVGAttributes } from 'react';

interface SocialIconProps extends SVGAttributes<SVGElement> {
  size?: number;
}

export const GithubIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

export const LinkedinIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

export const TwitterIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const InstagramIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

export const EnvelopeIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export const GlobeIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

export const FileLinesIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const FacebookIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const OrcidIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M7.5 17.5H6V8.5h1.5v9zM6.75 5.5c-.523 0-.95.427-.95.95.001.524.428.95.95.95s.95-.426.95-.95c-.001-.523-.427-.95-.95-.95zM9.25 8.5v9h2.5c2.209 0 4-1.791 4-4s-1.791-4-4-4H9.25zm1.5 7.5v-6h1c1.381 0 2.5 1.119 2.5 2.5s-1.119 2.5-2.5 2.5h-1z" fill="white"/>
  </svg>
);

export const ScopusIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M12.5 6c-2 0-3.5 1-3.5 2.5 0 2.5 3.5 2 3.5 4s-1.5 2-3 2c-1.5 0-2.5-.5-3-1l-.5 1.5c.5.5 2 1 3.5 1 2.5 0 4.5-1 4.5-3 0-2.5-3.5-2-3.5-4s1.5-2 3-2c1.2 0 2.2.5 2.8 1l.5-1.5c-.7-.5-1.8-1-2.8-1z" fill="white" stroke="white" strokeWidth="0.5"/>
  </svg>
);

export const WebOfScienceIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M5.5 7l2.5 10 2-7 2 7 2.5-10h-1.5l-1.5 7-2-7h-1l-2 7-1.5-7H5.5z" fill="#F5C400"/>
  </svg>
);

export const GoogleScholarIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z"/>
  </svg>
);

export const ResearchGateIcon = ({ size = 20, ...props }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M19.586 0c-.818 0-1.508.19-2.073.565-.563.377-.97.936-1.213 1.68a3.193 3.193 0 0 0-.112.437 8.365 8.365 0 0 0-.078.53 9 9 0 0 0-.05.727c-.01.282-.013.621-.013 1.016a31.121 31.123 0 0 0 .014 1.017 9 9 0 0 0 .05.727 7.946 7.946 0 0 0 .077.53h-.005a3.334 3.334 0 0 0 .113.438c.245.743.65 1.303 1.214 1.68.565.376 1.256.564 2.075.564.8 0 1.536-.213 2.105-.603.57-.39.94-.916 1.175-1.65.076-.235.135-.558.177-.93a10.9 10.9 0 0 0 .043-1.207v-.82c0-.095-.047-.142-.14-.142h-3.064c-.094 0-.14.047-.14.141v.956c0 .094.046.14.14.14h1.666c.056 0 .084.03.084.086 0 .36 0 .62-.036.865-.038.244-.1.447-.147.606-.108.385-.348.664-.638.876-.29.212-.738.35-1.227.35-.545 0-.901-.15-1.21-.353-.306-.203-.517-.454-.67-.915a3.136 3.136 0 0 1-.147-.762 17.366 17.367 0 0 1-.034-.656c-.01-.26-.014-.572-.014-.939a26.401 26.403 0 0 1 .014-.938 15.821 15.822 0 0 1 .035-.656 3.19 3.19 0 0 1 .148-.76 1.89 1.89 0 0 1 .742-1.01c.344-.244.593-.352 1.137-.352.508 0 .815.096 1.144.303.33.207.528.492.764.925.047.094.111.118.198.07l1.044-.43c.075-.048.09-.115.042-.199a3.549 3.549 0 0 0-.466-.742 3 3 0 0 0-.679-.607 3.313 3.313 0 0 0-.903-.41A4.068 4.068 0 0 0 19.586 0zM8.217 5.836c-1.69 0-3.036.086-4.297.086-1.146 0-2.291 0-3.007-.029v.831l1.088.2c.744.144 1.174.488 1.174 2.264v11.288c0 1.777-.43 2.12-1.174 2.263l-1.088.2v.832c.773-.029 2.12-.086 3.465-.086 1.29 0 2.951.057 3.667.086v-.831l-1.49-.2c-.773-.115-1.174-.487-1.174-2.264v-4.784c.688.057 1.29.057 2.206.057 1.748 3.123 3.41 5.472 4.355 6.56.86 1.032 2.177 1.691 3.839 1.691.487 0 1.003-.086 1.318-.23v-.744c-1.031 0-2.063-.716-2.808-1.518-1.26-1.376-2.95-3.582-4.355-6.074 2.32-.545 4.04-2.722 4.04-4.9 0-3.208-2.492-4.698-5.758-4.698zm-.515 1.29c2.406 0 3.839 1.26 3.839 3.552 0 2.263-1.547 3.782-4.097 3.782-.974 0-1.404-.03-2.063-.086v-7.19c.66-.059 1.547-.059 2.32-.059z"/>
  </svg>
);

interface SocialPlatform {
  id: string;
  label: string;
  icon: React.ComponentType<SocialIconProps>;
  color: string;
  colorClass: string;
}

export const socialIconMap: Record<string, React.ComponentType<SocialIconProps>> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  mail: EnvelopeIcon,
  globe: GlobeIcon,
  filetext: FileLinesIcon,
  facebook: FacebookIcon,
  x: TwitterIcon,
  orcid: OrcidIcon,
  scopus: ScopusIcon,
  webofscience: WebOfScienceIcon,
  googlescholar: GoogleScholarIcon,
  researchgate: ResearchGateIcon
};

export const getSocialIcon = (name: string): React.ComponentType<SocialIconProps> => {
  if (!name) return GlobeIcon;
  const normalized = name.toLowerCase().replace(/[\s-_]/g, '');
  return socialIconMap[normalized] || GlobeIcon;
};

export const availableSocialPlatforms: SocialPlatform[] = [
  { id: 'github', label: 'GitHub', icon: GithubIcon, color: '#24292e', colorClass: 'hover:text-[#24292e]' },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon, color: '#0077b5', colorClass: 'hover:text-[#0077b5]' },
  { id: 'twitter', label: 'Twitter (Legacy)', icon: TwitterIcon, color: '#1da1f2', colorClass: 'hover:text-[#1da1f2]' },
  { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: '#e1306c', colorClass: 'hover:text-[#e1306c]' },
  { id: 'mail', label: 'Email', icon: EnvelopeIcon, color: '#ea4335', colorClass: 'hover:text-[#ea4335]' },
  { id: 'globe', label: 'Website / Portals', icon: GlobeIcon, color: '#3b82f6', colorClass: 'hover:text-[#3b82f6]' },
  { id: 'filetext', label: 'Documents / CV', icon: FileLinesIcon, color: '#d97706', colorClass: 'hover:text-[#d97706]' },
  { id: 'facebook', label: 'Facebook', icon: FacebookIcon, color: '#1877f2', colorClass: 'hover:text-[#1877f2]' },
  { id: 'x', label: 'X (Twitter)', icon: TwitterIcon, color: '#000000', colorClass: 'hover:text-[#000000]' },
  { id: 'orcid', label: 'ORCID ID', icon: OrcidIcon, color: '#a6ce39', colorClass: 'hover:opacity-80' },
  { id: 'scopus', label: 'Scopus', icon: ScopusIcon, color: '#e9711c', colorClass: 'hover:opacity-80' },
  { id: 'webofscience', label: 'Web of Science', icon: WebOfScienceIcon, color: '#5e33bf', colorClass: 'hover:opacity-80' },
  { id: 'googlescholar', label: 'Google Scholar', icon: GoogleScholarIcon, color: '#4285f4', colorClass: 'hover:text-[#4285f4]' },
  { id: 'researchgate', label: 'ResearchGate', icon: ResearchGateIcon, color: '#00ccbb', colorClass: 'hover:text-[#00ccbb]' }
];
