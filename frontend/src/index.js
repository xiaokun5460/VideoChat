import React from 'react';
import ReactDOM from 'react-dom/client';
import ModernApp from './ModernApp';
import './ModernApp.css';
import 'antd/dist/reset.css';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ModernApp />
  </React.StrictMode>
);
