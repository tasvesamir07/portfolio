const fs = require('fs');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');
const { JSDOM } = require('jsdom');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT_STATIC = 5002;
const PORT_API = 5000;

// Simple static server to serve the built dist folder
function startStaticServer(dir, port) {
    return http.createServer((req, res) => {
        let urlPath = req.url.split('?')[0];
        let filePath = path.join(dir, urlPath === '/' ? 'index.html' : urlPath);
        
        // Fallback to index.html for client-side routing
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            filePath = path.join(dir, 'index.html');
        }
        
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg') contentType = 'image/jpeg';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.woff2') contentType = 'font/woff2';
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading resource');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }).listen(port);
}

async function prerender() {
    console.log('--- Starting Pre-rendering Pipeline ---');
    
    // 1. Start the API server in the background
    console.log('Starting API server...');
    const apiProcess = fork(path.join(__dirname, '..', '..', 'server', 'server.js'), {
        env: {
            ...process.env,
            PORT: PORT_API,
            NODE_ENV: 'production'
        },
        silent: true
    });

    // Wait 3 seconds for API server to boot and connect to DB
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Start the static server
    console.log('Starting static server...');
    const staticServer = startStaticServer(DIST_DIR, PORT_STATIC);

    const pages = [
        { path: '', file: 'index.html' },
        { path: 'academics', file: 'academics/index.html' },
        { path: 'gallery', file: 'gallery/index.html' },
        { path: 'research', file: 'research/index.html' },
        { path: 'experiences', file: 'experiences/index.html' },
        { path: 'publications', file: 'publications/index.html' },
        { path: 'newspaper', file: 'newspaper/index.html' }
    ];

    try {
        for (const page of pages) {
            const url = `http://localhost:${PORT_STATIC}/${page.path}`;
            console.log(`Pre-rendering ${url} -> dist/${page.file}...`);
            
            const dom = await JSDOM.fromURL(url, {
                resources: "usable",
                runScripts: "dangerously",
                pretendToBeVisual: true,
                beforeParse(window) {
                    // Polyfills for JSDOM
                    window.matchMedia = window.matchMedia || function() {
                        return {
                            matches: false,
                            addListener: function() {},
                            removeListener: function() {}
                        };
                    };
                    window.scrollTo = window.scrollTo || function() {};
                    
                    // Prevent service worker register errors in JSDOM
                    if (!window.navigator.serviceWorker) {
                        window.navigator.serviceWorker = {
                            register: () => Promise.resolve()
                        };
                    }
                }
            });

            // Wait for React Query to fetch data and render (skeleton to disappear)
            await new Promise(resolve => setTimeout(resolve, 4000));

            const html = dom.serialize();
            dom.window.close();

            const targetPath = path.join(DIST_DIR, page.file);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, html, 'utf8');
            console.log(`Successfully pre-rendered: ${page.file}`);
        }
    } catch (err) {
        console.error('Error during pre-rendering:', err);
    } finally {
        console.log('Shutting down servers...');
        staticServer.close();
        apiProcess.kill();
    }
    console.log('Pre-rendering pipeline completed.');
}

prerender();
