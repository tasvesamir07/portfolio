const { z } = require('zod');

// Helpers for optional/nullable strings
const optString = z.string().optional().nullable().or(z.literal(''));
const reqString = z.string().min(1, 'Required field');

const adminLoginSchema = z.object({
    identifier: z.string().min(1, 'Identifier is required.').optional(),
    username: z.string().min(1, 'Username is required.').optional(),
    email: z.string().min(1, 'Email is required.').optional(),
    password: z.string().min(1, 'Password is required.')
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Enter a valid email address.')
});

const resetPasswordSchema = z.object({
    email: z.string().email('Enter a valid email address.'),
    otp: z.string().min(6).max(6, 'Enter a valid 6-digit OTP.'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.')
});

const profileOtpSchema = z.object({
    username: z.string().min(1, 'Username is required.').optional(),
    email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters long.').optional().or(z.literal(''))
});

const profileConfirmSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit OTP.')
});

const messageSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Enter a valid email address.'),
    message: z.string().min(1, 'Message is required.')
});

const anonymousMessageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
    website: z.string().optional() // Honeypot field
});

const reorderSchema = z.object({
    orders: z.array(z.object({
        id: z.union([z.number(), z.string()]),
        sort_order: z.number()
    }))
});

const aboutSchema = z.object({
    bio_text: optString,
    resume_url: optString,
    name: optString,
    location: optString,
    title: optString,
    hero_image_url: optString,
    sub_bio: optString,
    logo_url: optString,
    site_name: optString,
    custom_nav: z.union([z.array(z.any()), z.object(z.any()), z.string()]).optional().nullable(),
    custom_sidebar_order: z.union([z.array(z.any()), z.object(z.any()), z.string()]).optional().nullable()
});

const academicsSchema = z.object({
    institution: optString,
    degree: optString,
    start_year: optString,
    end_year: optString,
    logo_url: optString,
    details_json: optString
});

const experiencesSchema = z.object({
    company: optString,
    position: optString,
    location: optString,
    start_date: optString,
    end_date: optString,
    description: optString,
    logo_url: optString,
    details_json: optString
});

const gallerySchema = z.object({
    image_url: optString,
    caption: optString,
    category: optString
});

const galleryCategoriesSchema = z.object({
    name: reqString
});

const newspapersSchema = z.object({
    title: optString,
    short_description: optString,
    image_url: optString,
    link_url: optString,
    sort_order: z.number().optional().nullable()
});

const pagesSchema = z.object({
    title: reqString,
    slug: reqString,
    content: optString,
    show_in_nav: z.boolean().optional().nullable(),
    details_json: optString
});

const publicationsSchema = z.object({
    title: optString,
    thumbnail_url: optString,
    journal_name: optString,
    pub_year: optString,
    authors: optString,
    introduction: optString,
    methods: optString,
    link_url: optString,
    file_url: optString,
    details_json: optString,
    doi_url: optString,
    journal_url: optString,
    doi: optString
});

const researchSchema = z.object({
    title: optString,
    description: optString,
    image_url: optString,
    link: optString,
    file_url: optString,
    status: optString,
    date_text: optString,
    details_json: optString
});

const researchInterestsSchema = z.object({
    interest: reqString,
    details: optString,
    icon_name: optString,
    details_json: optString
});

const skillsSchema = z.object({
    category: optString,
    items: z.union([z.string(), z.array(z.any())]).optional().nullable(),
    details_json: optString
});

const socialLinksSchema = z.object({
    platform: reqString,
    url: reqString,
    icon_name: optString,
    color_class: optString
});

const trainingsSchema = z.object({
    title: optString,
    topic: optString,
    date_text: optString,
    instructor: optString,
    details_json: optString
});

module.exports = {
    adminLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    profileOtpSchema,
    profileConfirmSchema,
    messageSchema,
    anonymousMessageSchema,
    reorderSchema,
    aboutSchema,
    academicsSchema,
    experiencesSchema,
    gallerySchema,
    galleryCategoriesSchema,
    newspapersSchema,
    pagesSchema,
    publicationsSchema,
    researchSchema,
    researchInterestsSchema,
    skillsSchema,
    socialLinksSchema,
    trainingsSchema
};
