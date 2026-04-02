import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  CalendarDays, 
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Settings
} from 'lucide-react';

const ClientLayout = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-inter flex-col">
      {/* Header - Combined nav for 1280x800 optimization */}
      <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 z-50 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-8">
          <Link to="/client" className="flex items-center gap-2 group transition-transform active:scale-95">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
               <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">
              Planner<span className="text-primary-600">Portal</span>
            </h1>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <Link
              to="/client"
              className="px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-primary-600 shadow-sm border border-slate-200 transition-all active:scale-95"
            >
              Weekly Planner
            </Link>
            <Link
              to="/admin"
              className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all active:scale-95"
            >
              Admin Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
             <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">ROLE:</span>
             <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Client</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200"></div>

          <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg group">
            <LogOut className="w-5 h-5 group-hover:animate-pulse" />
          </button>
        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-1 overflow-hidden bg-[#fdfdfd] relative">
          <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
