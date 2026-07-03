import React from 'react';
import { useLocation } from 'react-router-dom';
import HomeSkeleton from './HomeSkeleton';
import AcademicsSkeleton from './AcademicsSkeleton';
import GallerySkeleton from './GallerySkeleton';
import PublicationsSkeleton from './PublicationsSkeleton';
import ExperiencesSkeleton from './ExperiencesSkeleton';
import ContactSkeleton from './ContactSkeleton';
import ResearchInterestsSkeleton from './ResearchInterestsSkeleton';

const pageSkeletons: Record<string, React.ComponentType> = {
  '/': HomeSkeleton,
  '/academics': AcademicsSkeleton,
  '/gallery': GallerySkeleton,
  '/publications': PublicationsSkeleton,
  '/experiences': ExperiencesSkeleton,
  '/contact': ContactSkeleton,
  '/research-interests': ResearchInterestsSkeleton
};

const DefaultSkeleton = HomeSkeleton;

const DynamicFallback = () => {
  const location = useLocation();
  const SkeletonComponent = pageSkeletons[location.pathname] || DefaultSkeleton;
  return <SkeletonComponent />;
};

export default DynamicFallback;
