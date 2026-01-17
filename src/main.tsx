import { createRoot } from 'react-dom/client'
import './index.css'
import Page from './page.tsx'

createRoot(document.getElementById('root')!).render(
  <Page />,
)
