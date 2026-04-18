const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
let sharp = null;

try {
    sharp = require('sharp');
} catch {
    sharp = null;
}

const MAX_UPLOAD_SIZE_MB = 4;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const SUPABASE_BUCKET = 'portfolio-uploads';
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 80;

// Configure multer for temporary storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES
    }
});

const processFile = async (file) => {
    // We use the original extension since sharp (native resizing) 
    // is not supported in the Cloudflare Worker environment.
    const originalName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileBaseName = originalName.replace(/\.[^.]+$/, '');
    let filename = `${Date.now()}-${originalName}`;
    let buffer = file.buffer;
    let contentType = file.mimetype;

    const canCompressImage = Boolean(sharp)
        && /^image\/(jpeg|jpg|png|webp|avif|tiff)$/i.test(file.mimetype || '');

    if (canCompressImage) {
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
    
    // Check if we are running in Cloudflare/Production with Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filename, buffer, {
                contentType,
                upsert: true
            });

        if (error) throw new Error(`Supabase upload error: ${error.message}`);

        // Return the public URL
        const { data: { publicUrl } } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filename);
            
        return publicUrl;
    }

    // Local Fallback (Development only)
    if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
        const filepath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }
        fs.writeFileSync(filepath, buffer);
        return `/uploads/${filename}`;
    }

    throw new Error('File upload failed: Supabase storage is not configured.');
};

const createSupabaseAdminClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
};

const extractSupabaseObjectPath = (fileUrl = '') => {
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

const extractLocalUploadPath = (fileUrl = '') => {
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

const deleteManagedMediaFiles = async (fileUrls = []) => {
    const uniqueUrls = [...new Set((fileUrls || []).filter((value) => typeof value === 'string' && value.trim()))];
    if (!uniqueUrls.length) return [];

    const supabase = createSupabaseAdminClient();
    const supabaseObjectPaths = uniqueUrls
        .map(extractSupabaseObjectPath)
        .filter(Boolean);

    const failures = [];

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
        } catch (error) {
            failures.push(`Local delete error for ${path.basename(localPath)}: ${error.message}`);
        }
    });

    return failures;
};

module.exports = { upload, processFile, deleteManagedMediaFiles, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES };
