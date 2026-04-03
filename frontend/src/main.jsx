import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { RootAuthProvider } from './contexts/RootAuthContext';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import { CompanyAuthProvider } from './contexts/CompanyAuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
