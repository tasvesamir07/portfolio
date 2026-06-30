import React from 'react';
import { 
  FaGithub, 
  FaLinkedin, 
  FaTwitter, 
  FaInstagram, 
  FaEnvelope, 
  FaGlobe, 
  FaFileLines, 
  FaFacebook, 
  FaXTwitter 
} from 'react-icons/fa6';

// Custom inline SVG for ORCID
export const OrcidIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M7.5 17.5H6V8.5h1.5v9zM6.75 5.5c-.523 0-.95.427-.95.95s.427.95.95.95.95-.427.95-.95-.427-.95-.95-.95zM9.25 8.5v9h2.5c2.209 0 4-1.791 4-4s-1.791-4-4-4H9.25zm1.5 7.5v-6h1c1.381 0 2.5 1.119 2.5 2.5s-1.119 2.5-2.5 2.5h-1z" fill="white"/>
  </svg>
);

// Custom inline SVG for Scopus
export const ScopusIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M12.5 6c-2 0-3.5 1-3.5 2.5 0 2.5 3.5 2 3.5 4s-1.5 2-3 2c-1.5 0-2.5-.5-3-1l-.5 1.5c.5.5 2 1 3.5 1 2.5 0 4.5-1 4.5-3 0-2.5-3.5-2-3.5-4s1.5-2 3-2c1.2 0 2.2.5 2.8 1l.5-1.5c-.7-.5-1.8-1-2.8-1z" fill="white" stroke="white" strokeWidth="0.5"/>
  </svg>
);

// Custom inline SVG for Web of Science
export const WebOfScienceIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <circle cx="12" cy="12" r="11" fill="currentColor"/>
    <path d="M5.5 7l2.5 10 2-7 2 7 2.5-10h-1.5l-1.5 7-2-7h-1l-2 7-1.5-7H5.5z" fill="#F5C400"/>
  </svg>
);

// Custom inline SVG for Google Scholar (Official simple-icons path)
export const GoogleScholarIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z"/>
  </svg>
);

// Custom inline SVG for ResearchGate (Official simple-icons path)
export const ResearchGateIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <path d="M19.586 0c-.818 0-1.508.19-2.073.565-.563.377-.97.936-1.213 1.68a3.193 3.193 0 0 0-.112.437 8.365 8.365 0 0 0-.078.53 9 9 0 0 0-.05.727c-.01.282-.013.621-.013 1.016a31.121 31.123 0 0 0 .014 1.017 9 9 0 0 0 .05.727 7.946 7.946 0 0 0 .077.53h-.005a3.334 3.334 0 0 0 .113.438c.245.743.65 1.303 1.214 1.68.565.376 1.256.564 2.075.564.8 0 1.536-.213 2.105-.603.57-.39.94-.916 1.175-1.65.076-.235.135-.558.177-.93a10.9 10.9 0 0 0 .043-1.207v-.82c0-.095-.047-.142-.14-.142h-3.064c-.094 0-.14.047-.14.141v.956c0 .094.046.14.14.14h1.666c.056 0 .084.03.084.086 0 .36 0 .62-.036.865-.038.244-.1.447-.147.606-.108.385-.348.664-.638.876-.29.212-.738.35-1.227.35-.545 0-.901-.15-1.21-.353-.306-.203-.517-.454-.67-.915a3.136 3.136 0 0 1-.147-.762 17.366 17.367 0 0 1-.034-.656c-.01-.26-.014-.572-.014-.939a26.401 26.403 0 0 1 .014-.938 15.821 15.822 0 0 1 .035-.656 3.19 3.19 0 0 1 .148-.76 1.89 1.89 0 0 1 .742-1.01c.344-.244.593-.352 1.137-.352.508 0 .815.096 1.144.303.33.207.528.492.764.925.047.094.111.118.198.07l1.044-.43c.075-.048.09-.115.042-.199a3.549 3.549 0 0 0-.466-.742 3 3 0 0 0-.679-.607 3.313 3.313 0 0 0-.903-.41A4.068 4.068 0 0 0 19.586 0zM8.217 5.836c-1.69 0-3.036.086-4.297.086-1.146 0-2.291 0-3.007-.029v.831l1.088.2c.744.144 1.174.488 1.174 2.264v11.288c0 1.777-.43 2.12-1.174 2.263l-1.088.2v.832c.773-.029 2.12-.086 3.465-.086 1.29 0 2.951.057 3.667.086v-.831l-1.49-.2c-.773-.115-1.174-.487-1.174-2.264v-4.784c.688.057 1.29.057 2.206.057 1.748 3.123 3.41 5.472 4.355 6.56.86 1.032 2.177 1.691 3.839 1.691.487 0 1.003-.086 1.318-.23v-.744c-1.031 0-2.063-.716-2.808-1.518-1.26-1.376-2.95-3.582-4.355-6.074 2.32-.545 4.04-2.722 4.04-4.9 0-3.208-2.492-4.698-5.758-4.698zm-.515 1.29c2.406 0 3.839 1.26 3.839 3.552 0 2.263-1.547 3.782-4.097 3.782-.974 0-1.404-.03-2.063-.086v-7.19c.66-.059 1.547-.059 2.32-.059z"/>
  </svg>
);

export const socialIconMap = {
  github: FaGithub,
  linkedin: FaLinkedin,
  twitter: FaTwitter,
  instagram: FaInstagram,
  mail: FaEnvelope,
  globe: FaGlobe,
  filetext: FaFileLines,
  facebook: FaFacebook,
  x: FaXTwitter,
  orcid: OrcidIcon,
  scopus: ScopusIcon,
  webofscience: WebOfScienceIcon,
  googlescholar: GoogleScholarIcon,
  researchgate: ResearchGateIcon
};

export const getSocialIcon = (name) => {
  if (!name) return FaGlobe;
  const normalized = name.toLowerCase().replace(/[\s-_]/g, '');
  return socialIconMap[normalized] || FaGlobe;
};

export const availableSocialPlatforms = [
  { id: 'github', label: 'GitHub', icon: FaGithub, color: '#24292e', colorClass: 'hover:text-[#24292e]' },
  { id: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0077b5', colorClass: 'hover:text-[#0077b5]' },
  { id: 'twitter', label: 'Twitter (Legacy)', icon: FaTwitter, color: '#1da1f2', colorClass: 'hover:text-[#1da1f2]' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#e1306c', colorClass: 'hover:text-[#e1306c]' },
  { id: 'mail', label: 'Email', icon: FaEnvelope, color: '#ea4335', colorClass: 'hover:text-[#ea4335]' },
  { id: 'globe', label: 'Website / Portals', icon: FaGlobe, color: '#3b82f6', colorClass: 'hover:text-[#3b82f6]' },
  { id: 'filetext', label: 'Documents / CV', icon: FaFileLines, color: '#d97706', colorClass: 'hover:text-[#d97706]' },
  { id: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877f2', colorClass: 'hover:text-[#1877f2]' },
  { id: 'x', label: 'X (Twitter)', icon: FaXTwitter, color: '#000000', colorClass: 'hover:text-[#000000]' },
  { id: 'orcid', label: 'ORCID ID', icon: OrcidIcon, color: '#a6ce39', colorClass: 'hover:opacity-80' },
  { id: 'scopus', label: 'Scopus', icon: ScopusIcon, color: '#e9711c', colorClass: 'hover:opacity-80' },
  { id: 'webofscience', label: 'Web of Science', icon: WebOfScienceIcon, color: '#5e33bf', colorClass: 'hover:opacity-80' },
  { id: 'googlescholar', label: 'Google Scholar', icon: GoogleScholarIcon, color: '#4285f4', colorClass: 'hover:text-[#4285f4]' },
  { id: 'researchgate', label: 'ResearchGate', icon: ResearchGateIcon, color: '#00ccbb', colorClass: 'hover:text-[#00ccbb]' }
];
