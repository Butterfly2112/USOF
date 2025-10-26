import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import App from './App';
import './styles.css';
import Toast from './components/Toast';
import ThemeProvider from './theme';

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <BrowserRouter>
        <App />
        <Toast />
      </BrowserRouter>
    </ThemeProvider>
  </Provider>
);
