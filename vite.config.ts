import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // נתיבים יחסיים — כדי שהאתר יעבוד גם תחת תת-נתיב (GitHub Pages) וגם באלקטרון
  base: './',
  server: { port: 5174 },
  preview: { port: 4174 },
});
