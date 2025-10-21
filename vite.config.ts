import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
    output: {
      manualChunks: {
        // Separate vendor chunks
        'react-vendor': ['react', 'react-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-label', '@radix-ui/react-separator', '@radix-ui/react-slot', '@radix-ui/react-switch'],
        'utils-vendor': ['crypto-js', 'sonner', 'zustand'],
        'auth-vendor': ['@clerk/clerk-react'],
        'supabase-vendor': ['@supabase/supabase-js'],
        'icons-vendor': ['lucide-react']
      }
    }
    },
    // Reduce chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minify options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'crypto-js',
      'sonner',
      '@clerk/clerk-react',
      '@supabase/supabase-js'
    ],
  },
})