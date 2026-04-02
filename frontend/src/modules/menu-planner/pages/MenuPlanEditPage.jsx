/**
 * MenuPlanEditPage
 */
import { useParams } from 'react-router-dom';
import { useMenuPlan } from '../hooks/useMenuPlanner';
import MenuPlanFormPage from './MenuPlanFormPage';

export default function MenuPlanEditPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useMenuPlan(id);

  if (isLoading) return <div className="card"><p style={{ textAlign: 'center', padding: 32 }}>Loading...</p></div>;
  if (isError) return <div className="card"><p style={{ textAlign: 'center', padding: 32, color: 'var(--color-danger)' }}>Failed to load menu plan.</p></div>;

  return <MenuPlanFormPage existingPlan={data} />;
}
