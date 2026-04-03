import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useRootAuth } from './contexts/RootAuthContext';
import { useClientAuth } from './contexts/ClientAuthContext';
import { useCompanyAuth } from './contexts/CompanyAuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RootLoginPage from './portals/root/RootLoginPage';
import RootDashboardPage from './portals/root/RootDashboardPage';
import ClientLoginPage from './portals/client/ClientLoginPage';
import ClientDashboardPage from './portals/client/ClientDashboardPage';
import CompanyLoginPage from './portals/company/CompanyLoginPage';
import CompanyDashboardPage from './portals/company/CompanyDashboardPage';
import RecipeListPage from './modules/recipe/pages/RecipeListPage';
import RecipeCreatePage from './modules/recipe/pages/RecipeCreatePage';
import RecipeEditPage from './modules/recipe/pages/RecipeEditPage';
import RecipeDetailPage from './modules/recipe/pages/RecipeDetailPage';
import RecipeVersionsPage from './modules/recipe/pages/RecipeVersionsPage';
import RecipeReportPage from './modules/recipe/pages/RecipeReportPage';
import MenuPlanListPage from './modules/menu-planner/pages/MenuPlanListPage';
import MenuPlanCreatePage from './modules/menu-planner/pages/MenuPlanCreatePage';
import MenuPlanEditPage from './modules/menu-planner/pages/MenuPlanEditPage';
import MenuPlanDetailPage from './modules/menu-planner/pages/MenuPlanDetailPage';
import MenuPlanCalendarPage from './modules/menu-planner/pages/MenuPlanCalendarPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const isEmbed = window.self !== window.top;
  if (isEmbed) return children;
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootProtectedRoute({ children }) {
  const { rootAdmin, loading } = useRootAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!rootAdmin) return <Navigate to="/root" replace />;
  return children;
}

function ClientProtectedRoute({ children }) {
  const { clientAdmin, loading } = useClientAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!clientAdmin) return <Navigate to="/portal" replace />;
  return children;
}

function CompanyProtectedRoute({ children }) {
  const { companyUser, loading } = useCompanyAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!companyUser) return <Navigate to="/company" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/root" element={<RootLoginPage />} />
        <Route path="/root/dashboard" element={<RootProtectedRoute><RootDashboardPage /></RootProtectedRoute>} />
        <Route path="/portal" element={<ClientLoginPage />} />
        <Route path="/portal/dashboard" element={<ClientProtectedRoute><ClientDashboardPage /></ClientProtectedRoute>} />
        <Route path="/company" element={<CompanyLoginPage />} />
        <Route path="/company/dashboard" element={<CompanyProtectedRoute><CompanyDashboardPage /></CompanyProtectedRoute>} />
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
          <Route path="recipe-report" element={<RecipeReportPage />} />
          <Route path="menu-planner" element={<MenuPlanCalendarPage />} />
          <Route path="menu-planner/list" element={<MenuPlanListPage />} />
          <Route path="menu-planner/new" element={<MenuPlanCreatePage />} />
          <Route path="menu-planner/:id" element={<MenuPlanDetailPage />} />
          <Route path="menu-planner/:id/edit" element={<MenuPlanEditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
