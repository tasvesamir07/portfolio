import { z } from 'zod';

const optString = z.string().optional().nullable().or(z.literal(''));
const reqString = z.string().min(1, 'This field is required.');

export const adminLoginSchema = z.object({
    identifier: z.string().min(1, 'Identifier is required.').optional(),
    username: z.string().min(1, 'Username is required.').optional(),
    email: z.string().min(1, 'Email is required.').optional(),
    password: z.string().min(1, 'Password is required.')
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Enter a valid email address.')
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Enter a valid email address.'),
    otp: z.string().min(6).max(6, 'Enter a valid 6-digit OTP.'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.')
});

export const profileOtpSchema = z.object({
    username: z.string().min(1, 'Username is required.').optional(),
    email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters long.').optional().or(z.literal(''))
});

export const profileConfirmSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit OTP.')
});

export const messageSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Enter a valid email address.'),
    message: z.string().min(1, 'Message is required.')
});

export const anonymousMessageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
    website: z.string().optional()
});

export const reorderSchema = z.object({
    orders: z.array(z.object({
        id: z.union([z.number(), z.string()]),
        sort_order: z.number()
    }))
});

export const aboutSchema = z.object({
    bio_text: optString,
    resume_url: optString,
    name: optString,
    location: optString,
    title: optString,
    hero_image_url: optString,
    sub_bio: optString,
    logo_url: optString,
    site_name: optString,
    custom_nav: z.union([z.array(z.any()), z.object({}), z.string()]).optional().nullable(),
    custom_sidebar_order: z.union([z.array(z.any()), z.object({}), z.string()]).optional().nullable()
});

export const academicsSchema = z.object({
    institution: optString,
    degree: optString,
    start_year: optString,
    end_year: optString,
    logo_url: optString,
    details_json: optString
});

export const experiencesSchema = z.object({
    company: optString,
    position: optString,
    location: optString,
    start_date: optString,
    end_date: optString,
    description: optString,
    logo_url: optString,
    details_json: optString
});

export const gallerySchema = z.object({
    image_url: optString,
    caption: optString,
    category: optString
});

export const galleryCategoriesSchema = z.object({
    name: reqString
});

export const conferencesSchema = z.object({
    title: optString,
    main_author: optString,
    authors: optString,
    conference_date: optString,
    description: optString,
    link_url: optString,
    sort_order: z.number().optional().nullable()
});

export const newspapersSchema = z.object({
    title: optString,
    short_description: optString,
    image_url: optString,
    link_url: optString,
    sort_order: z.number().optional().nullable()
});

export const pagesSchema = z.object({
    title: reqString,
    slug: reqString,
    content: optString,
    show_in_nav: z.boolean().optional().nullable(),
    details_json: optString
});

export const publicationsSchema = z.object({
    title: optString,
    thumbnail_url: optString,
    journal_name: optString,
    pub_year: optString,
    authors: optString,
    main_author: optString,
    volume: optString,
    issue: optString,
    introduction: optString,
    methods: optString,
    link_url: optString,
    file_url: optString,
    details_json: optString,
    doi_url: optString,
    journal_url: optString,
    doi: optString
});

export const researchInterestsSchema = z.object({
    interest: optString,
    details: optString,
    icon_name: optString,
    details_json: optString
});

export const skillsSchema = z.object({
    category: optString,
    items: z.union([z.string(), z.array(z.any())]).optional().nullable(),
    details_json: optString
});

export const socialLinksSchema = z.object({
    platform: reqString,
    url: reqString,
    icon_name: optString,
    color_class: optString
});

export const teamMemberSchema = z.object({
    name: optString,
    photo_url: optString,
    research_area: optString,
    phone: optString,
    email: optString,
    academic_level: optString,
    member_type: optString,
    sort_order: z.number().optional().nullable()
});

export const membershipSchema = z.object({
    membership_type: optString,
    name: optString,
    url: optString,
    position: optString,
    sort_order: z.number().optional().nullable()
});

export const projectSchema = z.object({
    title: optString,
    funding_organization: optString,
    duration: optString,
    sort_order: z.number().optional().nullable()
});

export const trainingsSchema = z.object({
    title: optString,
    topic: optString,
    date_text: optString,
    instructor: optString,
    details_json: optString
});
