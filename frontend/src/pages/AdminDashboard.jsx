import { useState, useEffect } from 'react';
import { 
  Building2, 
  Beef, 
  UtensilsCrossed, 
  CalendarCheck, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { companiesApi, ingredientsApi, recipesApi, plannerApi } from '../api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    companies: 0,
    ingredients: 0,
    recipes: 0,
    plannedMeals: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const [companies, ingredients, recipes] = await Promise.all([
          companiesApi.getAll(),
          ingredientsApi.getAll(),
          recipesApi.getAll(),
        ]);

        // Aggregate planned meals across all companies for the current month
        let totalPlanned = 0;
        if (companies.data.length > 0) {
          const planRequests = companies.data.map(c =>
            plannerApi.getPlans({ company_id: c.id, start_date: startDate, end_date: endDate })
              .catch(() => ({ data: [] }))
          );
          const planResults = await Promise.all(planRequests);
          totalPlanned = planResults.reduce((sum, r) => sum + r.data.length, 0);
        }

        setStats({
          companies: companies.data.length,
          ingredients: ingredients.data.length,
          recipes: recipes.data.length,
          plannedMeals: totalPlanned,
        });
      } catch (error) {
        console.error('Failed to fetch stats', error);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Companies', value: stats.companies, icon: Building2, color: 'bg-blue-500' },
    { name: 'Ingredients', value: stats.ingredients, icon: Beef, color: 'bg-emerald-500' },
    { name: 'Available Recipes', value: stats.recipes, icon: UtensilsCrossed, color: 'bg-amber-500' },
    { name: 'Planned Meals (Month)', value: stats.plannedMeals, icon: CalendarCheck, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">Welcome Back, Admin</h1>
        <p className="text-slate-500">Here is what's happening with your menu planner today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`${card.color} p-3 rounded-xl text-white shadow-lg shadow-${card.color.split('-')[1]}-200`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.name}</p>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>+12% from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Recent Activities</h3>
            <button className="text-xs text-primary-600 font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">New recipe "Veg Biryani" added</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">System Status</h3>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Operational</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-600">Database Connection</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-600">Smart Shuffle Engine</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-600">Backup Service</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
