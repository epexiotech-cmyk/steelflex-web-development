import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/steelflex-web-development/',
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/website/index.html'),
                about: resolve(__dirname, 'src/website/about-us.html'),
                products: resolve(__dirname, 'src/website/products-structures.html'),
                projects: resolve(__dirname, 'src/website/projects.html'),
                projectDetail: resolve(__dirname, 'src/website/project-detail.html'),
                capabilities: resolve(__dirname, 'src/website/capabilities.html'),
                machineries: resolve(__dirname, 'src/website/machineries.html'),
                careers: resolve(__dirname, 'src/website/careers.html'),
                contact: resolve(__dirname, 'src/website/contact-us.html'),
                review: resolve(__dirname, 'src/website/review.html'),
                admin: resolve(__dirname, 'src/admin/index.html')
            }
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1:3000'
        }
    }
});
