import {defineConfig} from 'vite';
import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';

// The Vercel function remains in api/; only public browser assets go into dist/.
// These files are copied (not bundled) because the existing application uses
// classic-script global functions for its HTML event handlers.
const classicAssets = [
  'auth-config.js',
  'service-worker.js',
  'resources.json',
  'assets/legacy-app.js',
  'assets/chapter-search.js',
  'assets/education-model.js',
  'assets/subject-taxonomy.js',
  'assets/subject-organizer.js',
  'assets/weekly-planner.js',
  'assets/weekly-planner.css',
  'assets/library-flow.css',
  'assets/admin-library.js',
  'assets/chapters.js',
  'assets/ai-format.js',
  'assets/landing.js',
  'assets/public-explorer.js',
  'assets/bac-index.js',
  'assets/discover.js',
  'assets/discover.css',
  'assets/design-system-v4.css',
  'assets/contributor-guide.js',
  'assets/community.js',
  'assets/practice.js',
  'assets/study-hub.js'
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
        library:resolve('library/index.html'),
        discover:resolve('discover/index.html'),
        login:resolve('login/index.html'),
        student:resolve('student/index.html'),
        contributor:resolve('contributor/index.html'),
        admin:resolve('admin/index.html')
      }
    }
  }
});
