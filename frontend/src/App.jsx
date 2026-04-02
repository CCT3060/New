import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';
import AdminDashboard from './pages/AdminDashboard';
import CompaniesPage from './pages/CompaniesPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import ClientPortal from './pages/ClientPortal';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
        </Route>

        {/* Client Portal */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientPortal />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
