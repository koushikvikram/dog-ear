import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative, so the same build works at
// https://<user>.github.io/<repo>/, on a custom domain, and from localhost.
export default defineConfig({ base: './', plugins: [react()] })
