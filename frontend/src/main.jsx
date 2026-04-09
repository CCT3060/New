import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { RootAuthProvider } from './contexts/RootAuthContext';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import { CompanyAuthProvider } from './contexts/CompanyAuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootAuthProvider>
    <ClientAuthProvider>
    <CompanyAuthProvider>
    <AuthProvider>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
    </CompanyAuthProvider>
    </ClientAuthProvider>
    </RootAuthProvider>
  </React.StrictMode>
);
