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
  X,
  ClipboardList
} from 'lucide-react';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Companies', path: '/admin/companies', icon: Building2 },
    { name: 'Ingredients', path: '/admin/ingredients', icon: Beef },
    { name: 'Recipes', path: '/admin/recipes', icon: UtensilsCrossed },
    { name: 'Menu Planner', path: '/admin/planner', icon: CalendarDays },
    { name: 'Pax Count', path: '/admin/pax-report', icon: ClipboardList },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar - Responsive Overlay */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-black text-primary-600 flex items-center gap-2 tracking-tighter uppercase">
            <UtensilsCrossed className="w-6 h-6" />
            Menu Planner
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
                    ? 'bg-primary-600 text-white font-bold shadow-lg shadow-primary-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="text-sm font-bold">{item.name}</span>
                </div>
                {isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm">
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
            <h2 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight">
                {menuItems.find(i => i.path === location.pathname)?.name || 'Admin Panel'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center font-black text-xs">
                AD
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase leading-none">Basil Admin</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Superuser</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 min-h-0 custom-scrollbar">
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
