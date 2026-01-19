import { createRoot } from 'react-dom/client';
import './index.css';
import Routes from './root.jsx';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes />
  </BrowserRouter>
);
