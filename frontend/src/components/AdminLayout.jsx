import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Beef, 
  UtensilsCrossed, 
  CalendarDays, 
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Companies', path: '/admin/companies', icon: Building2 },
    { name: 'Ingredients', path: '/admin/ingredients', icon: Beef },
    { name: 'Recipes', path: '/admin/recipes', icon: UtensilsCrossed },
    { name: 'Client Portal', path: '/client', icon: CalendarDays },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar - Responsive Overlay */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6" />
            MenuPlanner
          </h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-600 font-medium shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive(item.path) ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm md:text-lg font-semibold text-slate-800">
                {menuItems.find(i => i.path === location.pathname)?.name || 'Admin Panel'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Link 
              to="/client" 
              className="text-[10px] md:text-xs font-bold bg-primary-50 text-primary-600 px-2 md:px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors whitespace-nowrap"
            >
              Client Portal
            </Link>
            
            <div className="hidden sm:flex items-center gap-3 border-l border-slate-100 pl-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           <Outlet />
        </div>
      </main>

      {/* Mobile Overlay Background */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
