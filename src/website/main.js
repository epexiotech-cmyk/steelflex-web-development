/**
 * SteelFlex Website Main Entry Point
 * Bundles all shared scripts for the website.
 */

// Import GSAP and ScrollTrigger first for global availability
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Make GSAP globally available for legacy scripts
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;

// Import shared utilities and storage
import '../shared/storage.js';

// Import components (navbar, footer, etc.)
import './components/components.js';

// Import animations and core site interactivity
import './animations.js';

// Import page-specific logic
import './page-logic.js';

console.log('SteelFlex Main Bundle Loaded');
