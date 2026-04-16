const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configure multer for temporary storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

const processFile = async (file) => {
    const isImage = file.mimetype.startsWith('image/');
    const extension = isImage ? '.webp' : path.extname(file.originalname);
    const filename = `${Date.now()}-${path.parse(file.originalname).name}${extension}`;
    
    // Check if we are running in Cloudflare/Production with Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        let buffer = file.buffer;

        if (isImage) {
            try {
                // Try to optimize image if sharp works
                buffer = await sharp(file.buffer)
                    .resize(1200, null, { withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
            } catch (e) {
                console.warn('Sharp failed on Edge (fallback to original):', e);
            }
        }

        const { data, error } = await supabase.storage
            .from('portfolio-uploads')
            .upload(filename, buffer, {
                contentType: isImage ? 'image/webp' : file.mimetype,
                upsert: true
            });

        if (error) throw new Error(`Supabase upload error: ${error.message}`);

        // Return the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('portfolio-uploads')
            .getPublicUrl(filename);
            
        return publicUrl;
    }

    // Local Fallback (Development only)
    const filepath = path.join(__dirname, 'uploads', filename);
    if (isImage) {
        await sharp(file.buffer)
            .resize(1200, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(filepath);
    } else {
        fs.writeFileSync(filepath, file.buffer);
    }

    return `/uploads/${filename}`;
};

module.exports = { upload, processFile };
