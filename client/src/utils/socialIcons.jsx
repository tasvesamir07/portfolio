import React from 'react';
import { 
  Github, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Mail, 
  Globe, 
  FileText, 
  Facebook 
} from 'lucide-react';

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
    <circle cx="12" cy="12" r="11" fill="#A6CE39"/>
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
    <circle cx="12" cy="12" r="11" fill="#E9711C"/>
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
    <circle cx="12" cy="12" r="11" fill="#5E33BF"/>
    <path d="M5.5 7l2.5 10 2-7 2 7 2.5-10h-1.5l-1.5 7-2-7h-1l-2 7-1.5-7H5.5z" fill="#F5C400"/>
  </svg>
);

// Custom inline SVG for Google Scholar
export const GoogleScholarIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <circle cx="12" cy="12" r="11" fill="#4285F4"/>
    <path d="M12 6.5L6 9.75l6 3.25 6-3.25-6-3.25zM7.5 11.4v2.7c0 .75.9 1.4 2.25 1.7L12 16.5l2.25-.7c1.35-.3 2.25-.95 2.25-1.7v-2.7L12 13.5l-4.5-2.1z" fill="white"/>
  </svg>
);

// Custom inline SVG for X (formerly Twitter)
export const XIcon = ({ size = 20, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const socialIconMap = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  mail: Mail,
  globe: Globe,
  filetext: FileText,
  facebook: Facebook,
  x: XIcon,
  orcid: OrcidIcon,
  scopus: ScopusIcon,
  webofscience: WebOfScienceIcon,
  googlescholar: GoogleScholarIcon
};

export const getSocialIcon = (name) => {
  if (!name) return Globe;
  const normalized = name.toLowerCase().replace(/[\s-_]/g, '');
  return socialIconMap[normalized] || Globe;
};

export const availableSocialPlatforms = [
  { id: 'github', label: 'GitHub', icon: Github, colorClass: 'hover:text-black' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, colorClass: 'hover:text-[#0077b5]' },
  { id: 'twitter', label: 'Twitter (Legacy)', icon: Twitter, colorClass: 'hover:text-[#1da1f2]' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, colorClass: 'hover:text-[#e1306c]' },
  { id: 'mail', label: 'Email', icon: Mail, colorClass: 'hover:text-red-500' },
  { id: 'globe', label: 'Website / Portals', icon: Globe, colorClass: 'hover:text-blue-500' },
  { id: 'filetext', label: 'Documents / CV', icon: FileText, colorClass: 'hover:text-amber-600' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, colorClass: 'hover:text-[#1877f2]' },
  { id: 'x', label: 'X (Twitter)', icon: XIcon, colorClass: 'hover:text-black' },
  { id: 'orcid', label: 'ORCID ID', icon: OrcidIcon, colorClass: 'hover:opacity-80' },
  { id: 'scopus', label: 'Scopus', icon: ScopusIcon, colorClass: 'hover:opacity-80' },
  { id: 'webofscience', label: 'Web of Science', icon: WebOfScienceIcon, colorClass: 'hover:opacity-80' },
  { id: 'googlescholar', label: 'Google Scholar', icon: GoogleScholarIcon, colorClass: 'hover:opacity-80' }
];
