import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RecipeListPage from './modules/recipe/pages/RecipeListPage';
import RecipeCreatePage from './modules/recipe/pages/RecipeCreatePage';
import RecipeEditPage from './modules/recipe/pages/RecipeEditPage';
import RecipeDetailPage from './modules/recipe/pages/RecipeDetailPage';
import RecipeVersionsPage from './modules/recipe/pages/RecipeVersionsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/recipes" replace />} />
          <Route path="recipes" element={<RecipeListPage />} />
          <Route path="recipes/new" element={<RecipeCreatePage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="recipes/:id/edit" element={<RecipeEditPage />} />
          <Route path="recipes/:id/versions" element={<RecipeVersionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
