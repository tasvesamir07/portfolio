import path = require('path');
const logger = require('./utils/logger');
import fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const MAX_UPLOAD_SIZE_MB = 4;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const SUPABASE_BUCKET = 'portfolio-uploads';
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 65;

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES
    },
    fileFilter: (req: any, file: any, cb: any) => {
        const isImage = /^image\/(jpeg|jpg|png|webp|avif|tiff|gif)$/i.test(file.mimetype || '');
        const isDocument = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i.test(file.mimetype || '');
        if (!isImage && !isDocument) {
            return cb(new Error('Only image files (jpeg, png, webp, avif, tiff, gif) and documents (pdf, doc, docx) are allowed.'), false);
        }
        cb(null, true);
    }
});

const checkBucketExists = async (supabase: any): Promise<void> => {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        const bucketExists = buckets.some((b: any) => b.name === SUPABASE_BUCKET);
        if (!bucketExists) {
            throw new Error(`Storage bucket "${SUPABASE_BUCKET}" does not exist. Create it in the Supabase dashboard.`);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('does not exist')) throw err;
        logger.error({ err }, '[Upload] Bucket check error:', message);
    }
};

const processFile = async (file: any): Promise<string> => {
    const originalName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileBaseName = originalName.replace(/\.[^.]+$/, '');
    let filename = `${Date.now()}-${originalName}`;
    let buffer = file.buffer;
    let contentType = file.mimetype;

    const isCompressibleImage = /^image\/(jpeg|jpg|png|webp|avif|tiff)$/i.test(file.mimetype || '');
    let sharp: any = null;
    if (isCompressibleImage) {
        try {
            sharp = require('sharp');
        } catch (e) {
            sharp = null;
        }
    }

    if (isCompressibleImage && sharp) {
        try {
            const optimizedBuffer = await sharp(file.buffer)
                .rotate()
                .resize({
                    width: MAX_IMAGE_DIMENSION,
                    height: MAX_IMAGE_DIMENSION,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .avif({ quality: IMAGE_QUALITY })
                .toBuffer();

            buffer = optimizedBuffer;
            contentType = 'image/avif';
            filename = `${Date.now()}-${fileBaseName}.avif`;
        } catch (sharpError: unknown) {
            const message = sharpError instanceof Error ? sharpError.message : String(sharpError);
            logger.warn('[Upload] Sharp processing failed, using original file buffer:', message);
        }
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        await checkBucketExists(supabase);

        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filename, buffer, {
                contentType,
                upsert: true
            });

        if (error) {
            logger.error({ err: error }, `[Upload] Supabase upload error:`, error.message);
            throw new Error(`Supabase upload error: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filename);

        return publicUrl;
    }

    if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
        const filepath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }
        fs.writeFileSync(filepath, buffer);
        return `/uploads/${filename}`;
    }

    logger.error('[Upload] Failed: Supabase storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
    throw new Error('File upload failed: Supabase storage is not configured.');
};

const createSupabaseAdminClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
};

const extractSupabaseObjectPath = (fileUrl = ''): string | null => {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    try {
        const parsedUrl = new URL(fileUrl);
        const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
        const markerIndex = parsedUrl.pathname.indexOf(marker);
        if (markerIndex === -1) return null;

        return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
    } catch {
        return null;
    }
};

const extractLocalUploadPath = (fileUrl = ''): string | null => {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    if (fileUrl.startsWith('/uploads/')) {
        return path.join(__dirname, fileUrl.replace(/^\/+/, ''));
    }

    try {
        const parsedUrl = new URL(fileUrl);
        if (!parsedUrl.pathname.startsWith('/uploads/')) return null;
        return path.join(__dirname, parsedUrl.pathname.replace(/^\/+/, ''));
    } catch {
        return null;
    }
};

const deleteManagedMediaFiles = async (fileUrls: string[] = []): Promise<string[]> => {
    const uniqueUrls = [...new Set((fileUrls || []).filter((value) => typeof value === 'string' && value.trim()))];
    if (!uniqueUrls.length) return [];

    const supabase = createSupabaseAdminClient();
    const supabaseObjectPaths = uniqueUrls
        .map(extractSupabaseObjectPath)
        .filter(Boolean) as string[];

    const failures: string[] = [];

    if (supabase && supabaseObjectPaths.length) {
        const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(supabaseObjectPaths);
        if (error) {
            failures.push(`Supabase delete error: ${error.message}`);
        }
    }

    uniqueUrls.forEach((fileUrl) => {
        const localPath = extractLocalUploadPath(fileUrl);
        if (!localPath) return;

        try {
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            failures.push(`Local delete error for ${path.basename(localPath)}: ${message}`);
        }
    });

    return failures;
};

export = { upload, processFile, deleteManagedMediaFiles, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES };
