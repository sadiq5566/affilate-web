'use client';

import { StrictMode } from 'react';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';

export default function AdminApp() {
  return (
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );
}
