import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
export default defineConfig({
  plugins: [svelte({
    onwarn(warning, handler) {
      if (warning.code.startsWith('a11y')) return
      handler(warning)
    }
  })],
  base: '/hermes-graph-game/'
})
