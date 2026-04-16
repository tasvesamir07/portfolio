const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configure multer for temporary storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

const processFile = async (file) => {
    // We use the original extension since sharp (native resizing) 
    // is not supported in the Cloudflare Worker environment.
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    
    // Check if we are running in Cloudflare/Production with Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const buffer = file.buffer;

        const { data, error } = await supabase.storage
            .from('portfolio-uploads')
            .upload(filename, buffer, {
                contentType: file.mimetype,
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
    if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
        const filepath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }
        fs.writeFileSync(filepath, file.buffer);
        return `/uploads/${filename}`;
    }

    throw new Error('File upload failed: Supabase storage is not configured.');
};

module.exports = { upload, processFile };
