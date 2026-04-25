import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
    appType: 'mpa',
    base: '/',
    root: 'src/website',
    publicDir: resolve(__dirname, 'public'),
    resolve: {
        alias: {
            '/src': resolve(__dirname, 'src'),
            '/components': resolve(__dirname, 'src/website/components')
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
            // Proxy API requests to the backend
            '/api': 'http://127.0.0.1:3000',
            // Proxy Admin Panel to the backend (Express serves it from public/)
            '/admin': 'http://127.0.0.1:3000'
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url.split('?')[0];
                
                // Handle clean URLs for website pages
                if (!url.includes('.') && url !== '/' && !url.startsWith('/api') && !url.startsWith('/admin') && !url.startsWith('/@') && !url.startsWith('/src')) {
                    const htmlPath = resolve(__dirname, 'src/website', `${url.slice(1)}.html`);
                    if (fs.existsSync(htmlPath)) {
                        req.url = `${url}.html`;
                    }
                }
                
                next();
            });
        }
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/website/index.html'),
                'about-us': resolve(__dirname, 'src/website/about-us.html'),
                'products-structures': resolve(__dirname, 'src/website/products-structures.html'),
                projects: resolve(__dirname, 'src/website/projects.html'),
                capabilities: resolve(__dirname, 'src/website/capabilities.html'),
                machineries: resolve(__dirname, 'src/website/machineries.html'),
                careers: resolve(__dirname, 'src/website/careers.html'),
                'contact-us': resolve(__dirname, 'src/website/contact-us.html'),
                review: resolve(__dirname, 'src/website/review.html'),
                404: resolve(__dirname, 'src/website/404.html'),
                admin: resolve(__dirname, 'src/admin/index.html')
            }
        }
    }
});
