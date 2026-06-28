import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
// globals.css = design system Lumina (fonds, couleurs texte, thème sombre, skeleton…).
// Importé APRÈS index.css pour que ses tokens (--card-bg, --text-primary, --border…) gagnent.
import '@/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
