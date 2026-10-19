import path from 'path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from '../vite.config';

const root = path.resolve(__dirname, '..');
const src = (p: string) => path.join(root, 'src', p);
const mock = (p: string) => src(`stories/_support/mocks/${p}`);

/**
 * Production modules swapped for in-memory fakes in every story. Matching is
 * done on the resolved file, so aliased, relative and barrel imports are all caught.
 */
const MODULE_MOCKS: Record<string, string> = {
  [src('core/supabase/client.ts')]: mock('supabaseClient.ts'),
  [src('core/cv/mediapipe-loader.ts')]: mock('mediapipe.ts'),
  [src('core/cv/cursor/handLandmarkerLoader.ts')]: mock('mediapipe.ts'),
  [src('features/registration/services/faceCropService.ts')]: mock('faceCropService.ts'),
};

function storyMocks(): Plugin {
  const mockFiles = new Set(Object.values(MODULE_MOCKS));
  return {
    name: 'me2you-story-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || mockFiles.has(importer.split('?')[0])) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const target = resolved && MODULE_MOCKS[resolved.id.split('?')[0]];
      return target ?? null;
    },
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [storyMocks()],
    publicDir: path.join(root, 'public'),
    define: {
      // The real client is never loaded, but env lookups elsewhere shouldn't warn.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://mock.supabase.local'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('mock-anon-key'),
    },
  }),
);
