import React from 'react';
import Header from './components/Header';
import AppRoutes from './AppRoutes';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="app-root">
      <Header />
      <main className="container">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
