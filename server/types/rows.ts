export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  created_at: string;
  updated_at: string;
  otp_hash: string | null;
  otp_expires_at: string | null;
  pending_username: string | null;
  pending_email: string | null;
  pending_password_hash: string | null;
}

export interface AboutRow {
  id: number;
  name: string | null;
  title: string | null;
  location: string | null;
  site_name: string | null;
  bio_text: string | null;
  sub_bio: string | null;
  resume_url: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  custom_nav: unknown;
  updated_at: string;
}

export interface PageRow {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  show_in_nav: boolean;
  details_json: string | null;
  created_at: string;
}

export interface AcademicRow {
  id: number;
  institution: string | null;
  degree: string | null;
  start_year: string | null;
  end_year: string | null;
  logo_url: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface ExperienceRow {
  id: number;
  company: string | null;
  position: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  logo_url: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface TrainingRow {
  id: number;
  title: string | null;
  topic: string | null;
  date_text: string | null;
  instructor: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface SkillRow {
  id: number;
  category: string | null;
  items: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface ResearchInterestRow {
  id: number;
  interest: string | null;
  details: string | null;
  icon_name: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface PublicationRow {
  id: number;
  title: string | null;
  thumbnail_url: string | null;
  journal_name: string | null;
  pub_year: string | null;
  authors: string | null;
  main_author: string | null;
  volume: string | null;
  issue: string | null;
  introduction: string | null;
  methods: string | null;
  link_url: string | null;
  file_url: string | null;
  doi_url: string | null;
  journal_url: string | null;
  doi: string | null;
  pages: string | null;
  impact_factor: string | null;
  quartile: string | null;
  details_json: string | null;
  sort_order: number;
  created_at: string;
}

export interface GalleryCategoryRow {
  id: number;
  name: string;
  sort_order: number;
}

export interface GalleryRow {
  id: number;
  image_url: string;
  caption: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export interface MessageRow {
  id: number;
  name: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
}

export interface AnonymousMessageRow {
  id: number;
  message: string;
  ip_address: string | null;
  created_at: string;
  is_read: boolean;
}

export interface SocialLinkRow {
  id: number;
  platform: string | null;
  url: string | null;
  icon_name: string | null;
  color_class: string | null;
  sort_order: number;
  created_at: string;
}

export interface NewspaperRow {
  id: number;
  title: string;
  title_bn: string | null;
  title_ko: string | null;
  short_description: string | null;
  short_description_bn: string | null;
  short_description_ko: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
