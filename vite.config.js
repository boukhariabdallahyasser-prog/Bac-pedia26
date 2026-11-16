import {defineConfig} from 'vite';
import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';

// The Vercel function remains in api/; only public browser assets go into dist/.
// These files are copied (not bundled) because the existing application uses
// classic-script global functions for its HTML event handlers.
const classicAssets = [
  'auth-config.js',
  'resources.json',
  'assets/legacy-app.js',
  'assets/chapter-search.js',
  'assets/chapters.js',
  'assets/ai-format.js',
  'assets/landing.js',
  'assets/community.js'
];
function copyClassicAssets() {
  return {
    name: 'bac-pedia-copy-classic-assets',
    apply: 'build',
    closeBundle() {
      const output=resolve('dist');
      for(const relativePath of classicAssets){
        const from=resolve(relativePath),to=join(output,relativePath);
        if(!existsSync(from))throw new Error('Missing required runtime asset: '+relativePath);
        mkdirSync(dirname(to),{recursive:true});
        copyFileSync(from,to);
      }
    }
  };
}
export default defineConfig({
  base: '/',
  plugins:[copyClassicAssets()],
  build:{
    outDir:'dist',emptyOutDir:true,sourcemap:false,target:'es2022',
    rollupOptions:{
      // A genuine multi-page app: each role has an independent HTML build.
      input:{
        landing:resolve('index.html'),
        student:resolve('student/index.html'),
        contributor:resolve('contributor/index.html'),
        admin:resolve('admin/index.html')
      }
    }
  }
});
