import React from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (no request to Google): Manrope for everything, Source Serif 4 italic for quotes.
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/400-italic.css'
import './design-system/index.js'
import './styles.css'
import './app.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
