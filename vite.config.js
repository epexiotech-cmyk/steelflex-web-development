import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
    appType: 'mpa',
    base: '/',
    root: '.',
    publicDir: resolve(__dirname, 'public'),
    resolve: {
        alias: {
            '/src': resolve(__dirname, 'src'),
            '/components': resolve(__dirname, 'src/website/components'),
            '/assets/main.js': resolve(__dirname, 'src/website/main.js'),
            '/assets/admin.js': resolve(__dirname, 'src/admin/js/main.js')
        }
    },
    server: {
        port: 5173,
        host: true,
        fs: {
            allow: [
                resolve(__dirname)
            ]
        },
        proxy: {
            // Proxy API and Upload requests to the backend
            '/api': 'http://127.0.0.1:3000',
            '/upload': 'http://127.0.0.1:3000',
            '/uploads': 'http://127.0.0.1:3000'
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url || '';
                const [path, query] = url.split('?');
                const queryString = query ? `?${query}` : '';

                // Handle root /
                if (path === '/') {
                    res.writeHead(302, { Location: '/src/website/index.html' });
                    res.end();
                    return;
                }
                
                // Handle admin
                if (path === '/admin' || path === '/admin/') {
                    res.writeHead(302, { Location: '/src/admin/index.html' });
                    res.end();
                    return;
                }

                // Explicit clean URLs for website pages
                const cleanPaths = [
                    '/about-us', 
                    '/products-structures', 
                    '/capabilities', 
                    '/machineries', 
                    '/projects', 
                    '/careers', 
                    '/contact-us', 
                    '/review'
                ];

                if (cleanPaths.includes(path)) {
                    res.writeHead(302, { Location: `/src/website${path}.html${queryString}` });
                    res.end();
                    return;
                }
                
        next();
            });
        }
    },
    preview: {
        port: 4173,
        host: true,
        proxy: {
            '/api': 'http://127.0.0.1:3000',
            '/upload': 'http://127.0.0.1:3000',
            '/uploads': 'http://127.0.0.1:3000'
        }
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/website/index.html'),
                about: resolve(__dirname, 'src/website/about-us.html'),
                contact: resolve(__dirname, 'src/website/contact-us.html'),
                products: resolve(__dirname, 'src/website/products-structures.html'),
                projects: resolve(__dirname, 'src/website/projects.html'),
                capabilities: resolve(__dirname, 'src/website/capabilities.html'),
                machineries: resolve(__dirname, 'src/website/machineries.html'),
                careers: resolve(__dirname, 'src/website/careers.html'),
                review: resolve(__dirname, 'src/website/review.html'),
                admin: resolve(__dirname, 'src/admin/index.html')
            }
        }
    }
});
