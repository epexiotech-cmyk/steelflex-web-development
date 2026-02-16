import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'web_pages/index.html'),
                about: resolve(__dirname, 'web_pages/about-us.html'),
                products: resolve(__dirname, 'web_pages/products-structures.html'),
                projects: resolve(__dirname, 'web_pages/projects.html'),
                projectDetail: resolve(__dirname, 'web_pages/project-detail.html'),
                capabilities: resolve(__dirname, 'web_pages/capabilities.html'),
                machineries: resolve(__dirname, 'web_pages/machineries.html'),
                careers: resolve(__dirname, 'web_pages/careers.html'),
                contact: resolve(__dirname, 'web_pages/contact-us.html'),
                admin: resolve(__dirname, 'src/admin/index.html')
            }
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
