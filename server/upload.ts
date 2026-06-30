import path = require('path');
import fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const MAX_UPLOAD_SIZE_MB = 4;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const SUPABASE_BUCKET = 'portfolio-uploads';
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 80;

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES
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
    } catch (err: any) {
        if (err.message.includes('does not exist')) throw err;
        console.error('[Upload] Bucket check error:', err.message);
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
        const optimizedBuffer = await sharp(file.buffer)
            .rotate()
            .resize({
                width: MAX_IMAGE_DIMENSION,
                height: MAX_IMAGE_DIMENSION,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: IMAGE_QUALITY })
            .toBuffer();

        buffer = optimizedBuffer;
        contentType = 'image/webp';
        filename = `${Date.now()}-${fileBaseName}.webp`;
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
            console.error(`[Upload] Supabase upload error:`, error.message);
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

    console.error('[Upload] Failed: Supabase storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
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
        } catch (error: any) {
            failures.push(`Local delete error for ${path.basename(localPath)}: ${error.message}`);
        }
    });

    return failures;
};

export = { upload, processFile, deleteManagedMediaFiles, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES };
