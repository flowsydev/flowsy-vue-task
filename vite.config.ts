import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import dts from "vite-plugin-dts";

const libName = "flowsydev-vue-task";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: libName,
      formats: ["es", "umd"],
      fileName: (format) => `${libName}.${format}.js`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        exports: "named"
      }
    }
  },
  plugins: [vue(), dts()]
})
