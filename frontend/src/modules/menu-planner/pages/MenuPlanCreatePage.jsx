/**
 * MenuPlanCreatePage
 */
import MenuPlanFormPage from './MenuPlanFormPage';
import { useAuth } from '../../../contexts/AuthContext';

export default function MenuPlanCreatePage() {
  const { user } = useAuth();
  return <MenuPlanFormPage warehouseId={user?.warehouseId || ''} />;
}
