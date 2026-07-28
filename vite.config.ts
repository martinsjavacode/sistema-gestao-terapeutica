import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function stubUnusedSupabaseModules(): Plugin {
  const stubs: Record<string, string> = {
    '@supabase/realtime-js': `
      export class RealtimeClient { constructor() {}; connect() {}; disconnect() {}; channel() { return { subscribe() {}, unsubscribe() {} } }; removeChannel() {}; removeAllChannels() {}; getChannels() { return [] } }
      export class RealtimeChannel {}
      export const REALTIME_LISTEN_TYPES = {}
      export const REALTIME_SUBSCRIBE_STATES = {}
      export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {}
    `,
    '@supabase/storage-js': `
      export class StorageClient { constructor() {}; from() { return {} } }
      export class StorageApiError extends Error { constructor(m) { super(m) } }
    `,
    '@supabase/functions-js': `
      export class FunctionsClient { constructor() {}; invoke() { return Promise.resolve({ data: null, error: null }) } }
      export class FunctionsError extends Error {}
      export class FunctionsFetchError extends Error {}
      export class FunctionsHttpError extends Error {}
      export class FunctionsRelayError extends Error {}
      export const FunctionRegion = {}
    `,
  }

  return {
    name: 'stub-unused-supabase',
    enforce: 'pre',
    resolveId(id) { if (stubs[id]) return `\0stub:${id}` },
    load(id) { if (id.startsWith('\0stub:')) return stubs[id.slice(6)] },
  }
}

export default defineConfig({
  plugins: [stubUnusedSupabaseModules(), react()],
  base: '/sistema-gestao-terapeutica/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — ~130KB, cache longa vida
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react'
          // Supabase — ~120KB
          if (id.includes('@supabase/')) return 'supabase'
          // TanStack Query — ~40KB
          if (id.includes('@tanstack/')) return 'tanstack'
          // React Router — ~43KB
          if (id.includes('react-router')) return 'router'
          // Lucide icons — ~22KB
          if (id.includes('lucide-react')) return 'lucide'
        },
      },
    },
  },
})
