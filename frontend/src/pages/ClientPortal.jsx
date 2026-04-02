import { useState, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners
} from '@dnd-kit/core';
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  setYear,
  getYear,
  parseISO
} from 'date-fns';
import { 
  Building2, 
  Shuffle, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Utensils,
  RefreshCw,
  Search,
  Download,
  FileJson,
  FileText,
  RotateCcw,
  Trash2,
  Copy
} from 'lucide-react';
import { companiesApi, recipesApi, plannerApi } from '../api';
import DraggableRecipe from '../components/DraggableRecipe';
import DroppableSlot from '../components/DroppableSlot';
import toast from 'react-hot-toast';

const categories = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

const ClientPortal = () => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menuPlans, setMenuPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchRecipe, setSearchRecipe] = useState('');
  const [activeBankCategory, setActiveBankCategory] = useState('All');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const days = useMemo(() => eachDayOfInterval({
    start: currentWeekStart,
    end: addDays(currentWeekStart, 6)
  }), [currentWeekStart]);

  const fetchData = async () => {
    try {
      const [cRes, rRes] = await Promise.all([companiesApi.getAll(), recipesApi.getAll()]);
      setCompanies(cRes.data);
      setRecipes(rRes.data);
      if (cRes.data.length > 0 && !selectedCompany) {
        setSelectedCompany(cRes.data[0]);
      }
    } catch (error) {
      console.error('FetchData error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    if (!selectedCompany) return;
    try {
      const { data } = await plannerApi.getPlans({
        company_id: selectedCompany.id,
        start_date: format(days[0], 'yyyy-MM-dd'),
        end_date: format(days[6], 'yyyy-MM-dd'),
      });
      setMenuPlans(data);
    } catch (error) {
      console.error('FetchPlans error:', error);
      toast.error('Failed to load menu plans');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchPlans(); }, [selectedCompany, currentWeekStart]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || !selectedCompany) return;

    const recipe = active.data.current.recipe;
    const { category, date } = over.data.current;

    if (recipe.category_type !== category) {
       toast.error(`Invalid Category: This ${recipe.name} is for ${recipe.category_type}, not ${category}`);
       return;
    }

    try {
        await plannerApi.assign({
            company_id: selectedCompany.id,
            recipe_id: recipe.id,
            plan_date: date,
            category: category
        });
        toast.success(`Successfully added ${recipe.name}`);
        fetchPlans();
    } catch (error) {
        console.error('DragEnd error:', error);
        toast.error(`Editing Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
        await plannerApi.delete(id);
        toast.success('Deleted from menu');
        fetchPlans();
    } catch (error) {
        console.error('Delete error:', error);
        toast.error('Delete failed');
    }
  };

  const handleClearWeek = async () => {
    if (!selectedCompany || !window.confirm('Delete every item in THIS week?')) return;
    try {
        await plannerApi.clearWeek({
            company_id: selectedCompany.id,
            start_date: format(days[0], 'yyyy-MM-dd')
        });
        toast.success('Week cleared');
        fetchPlans();
    } catch (error) {
        toast.error('Clear failed');
    }
  };

  const handleShuffle = async () => {
    if (!selectedCompany) return;
    const loadingToast = toast.loading('Generating smart menu...');
    try {
        await plannerApi.shuffle({
            company_id: selectedCompany.id,
            start_date: format(days[0], 'yyyy-MM-dd')
        });
        toast.dismiss(loadingToast);
        toast.success('Smart Shuffle Complete!');
        fetchPlans();
    } catch (error) {
        toast.dismiss(loadingToast);
        console.error('Shuffle error:', error);
        toast.error(error.response?.data?.error || 'Shuffle failed');
    }
  };

  const getPlansForSlot = (date, category) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return menuPlans.filter(plan => plan.plan_date === dateStr && plan.category === category);
  };

  const years = Array.from({ length: 11 }, (_, i) => getYear(new Date()) - 5 + i);

  const changeYear = (y) => setCurrentWeekStart(startOfWeek(setYear(currentWeekStart, y), { weekStartsOn: 1 }));
  
  const handleDateChange = (dateStr) => {
    if (!dateStr) return;
    const selectedDate = parseISO(dateStr);
    setCurrentWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchRecipe.toLowerCase());
        const matchesCategory = activeBankCategory === 'All' || r.category_type === activeBankCategory;
        return matchesSearch && matchesCategory;
    });
  }, [recipes, searchRecipe, activeBankCategory]);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Planner...</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-3 p-4 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
        
        {/* Header Navigation Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
             {/* Company Selector */}
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                <div className="flex items-center px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                   <Building2 className="w-3.5 h-3.5 text-primary-500 mr-2" />
                   <select 
                        className="bg-transparent border-none focus:ring-0 font-bold text-slate-700 pr-6 text-xs"
                        value={selectedCompany?.id || ''}
                        onChange={(e) => setSelectedCompany(companies.find(c => c.id === parseInt(e.target.value)))}
                   >
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
            </div>

            {/* Date/Week Picker */}
            <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-100 group">
                <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 rounded-lg shadow-sm border border-slate-50 active:scale-90 transition-transform">
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                
                <div className="px-2 flex items-center gap-2 font-bold text-[11px] relative">
                    <div className="group/date relative inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm hover:border-primary-300 transition-all cursor-pointer">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        <span className="text-slate-700 flex items-center gap-1">
                            {format(days[0], 'MMM dd')} - {format(days[6], 'MMM dd')}
                            <ChevronRight className="w-2.5 h-2.5 opacity-30 group-hover/date:opacity-100 rotate-90 ml-1" />
                        </span>
                        <input 
                            type="date" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={(e) => handleDateChange(e.target.value)}
                        />
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1"></div>

                    <select value={getYear(currentWeekStart)} onChange={(e) => changeYear(parseInt(e.target.value))} className="bg-transparent border-none focus:ring-0 cursor-pointer text-slate-600 font-bold p-0 text-[11px]">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 rounded-lg shadow-sm border border-slate-50 active:scale-90 transition-transform">
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-100">
                <button title="Refresh Data" onClick={fetchPlans} className="p-2 hover:bg-white text-slate-400 hover:text-primary-600 rounded-lg transition-all group">
                    <RotateCcw className="w-4 h-4 group-active:rotate-180 transition-transform duration-500" />
                </button>
                
                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                <button title="Clear Week" onClick={handleClearWeek} className="p-2 hover:bg-white text-slate-400 hover:text-red-500 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>

                <button title="Copy Week" onClick={() => {
                    const fromId = prompt("Enter Company ID to copy from:");
                    if(fromId) {
                        toast.promise(
                            plannerApi.copyWeek({
                                to_company_id: selectedCompany.id,
                                from_company_id: fromId,
                                start_date: format(days[0], 'yyyy-MM-dd')
                            }),
                            {
                                loading: 'Copying...',
                                success: (res) => { fetchPlans(); return res.data.message; },
                                error: 'Copy failed'
                            }
                        );
                    }
                }} className="p-2 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-lg transition-all">
                    <Copy className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                <button title="Export CSV" onClick={() => {
                    const csvRows = [['Date', 'Category', 'Recipe'], ...menuPlans.map(p => [p.plan_date, p.category, p.recipe_name])];
                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `menu_plan_${selectedCompany.name}.csv`);
                    document.body.appendChild(link);
                    link.click();
                }} className="p-2 hover:bg-white text-slate-400 hover:text-emerald-600 rounded-lg transition-all">
                    <FileJson className="w-4 h-4" />
                </button>
                <button title="Export PDF" onClick={() => window.print()} className="p-2 hover:bg-white text-slate-400 hover:text-rose-500 rounded-lg transition-all">
                    <FileText className="w-4 h-4" />
                </button>
             </div>
             
             <button 
                onClick={handleShuffle}
                className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-xl font-bold text-[11px] shadow-lg shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all"
             >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest">Smart Shuffle</span>
             </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden items-stretch">
          {/* Kitchen Bank */}
          <div className="w-72 bg-white border border-slate-100 rounded-2xl flex flex-col h-full shadow-sm">
             <div className="p-4 border-b border-slate-50">
                <h3 className="text-sm font-black text-slate-800 flex items-center justify-between mb-3 uppercase tracking-tighter">
                    <span className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-primary-500" />
                        Kitchen Bank
                    </span>
                    <button onClick={fetchData} className="p-1 hover:bg-slate-50 rounded text-slate-400" title="Reload Recipes">
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </h3>
                
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Search recipes..." 
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:bg-white focus:border-primary-300 transition-all font-bold placeholder:text-slate-300 shadow-inner"
                            value={searchRecipe}
                            onChange={(e) => setSearchRecipe(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 rounded-lg">
                        {['All', ...categories].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveBankCategory(cat)}
                                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                                    activeBankCategory === cat 
                                    ? 'bg-white text-primary-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {cat === 'Evening Snacks' ? 'Snacks' : cat}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/20">
                {filteredRecipes.map(recipe => (
                    <DraggableRecipe key={recipe.id} recipe={recipe} />
                ))}
                {filteredRecipes.length === 0 && (
                    <div className="text-center py-10 opacity-30 italic">
                        <p className="text-[10px] font-black text-slate-300 uppercase">No recipes found</p>
                    </div>
                )}
             </div>
          </div>

          {/* Main Planner Grid */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="grid grid-cols-[110px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-100 flex-shrink-0">
                <div className="p-3 border-r border-slate-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-300" />
                </div>
                {days.map(day => (
                    <div key={day.toString()} className={`p-2 text-center border-r border-slate-100 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary-50/40' : ''}`}>
                        <p className={`text-[9px] uppercase font-black tracking-widest ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-slate-400'}`}>
                            {format(day, 'EEE')}
                        </p>
                        <p className={`text-lg font-black ${isSameDay(day, new Date()) ? 'text-primary-700' : 'text-slate-700'}`}>
                            {format(day, 'dd')}
                        </p>
                    </div>
                ))}
            </div>
            
            <div className="flex-1 overflow-y-hidden">
                <div className="h-full flex flex-col">
                    {categories.map(category => (
                        <div key={category} className="grid grid-cols-[110px_repeat(7,1fr)] border-b border-slate-50 last:border-b-0 flex-1 min-h-0">
                            <div className="p-3 border-r border-slate-100 bg-slate-50/10 flex flex-col justify-center items-center gap-1.5 relative group/row">
                                 <Utensils className="w-3.5 h-3.5 text-slate-300 group-hover/row:text-primary-400 transition-colors" />
                                 <span className="text-[9px] font-black text-slate-400 uppercase text-center leading-tight tracking-widest">
                                    {category === 'Evening Snacks' ? 'Snacks' : category}
                                 </span>
                                 <button 
                                    className="absolute top-1 right-1 opacity-0 group-hover/row:opacity-100 p-1 hover:text-red-500 transition-all"
                                    title={`Clear all ${category}s for this week`}
                                    onClick={async () => {
                                        if(!confirm(`Delete all ${category} items for this week?`)) return;
                                        try {
                                            // Manual row delete logic:
                                            const categoryPlans = menuPlans.filter(p => p.category === category);
                                            await Promise.all(categoryPlans.map(p => plannerApi.delete(p.id)));
                                            toast.success(`${category} cleared`);
                                            fetchPlans();
                                        } catch (e) { toast.error('Clear failed'); }
                                    }}
                                 >
                                    <Trash2 className="w-3 h-3" />
                                 </button>
                            </div>
                            {days.map(day => {
                                const plans = getPlansForSlot(day, category);
                                const id = `slot-${format(day, 'yyyy-MM-dd')}-${category}`;
                                return (
                                    <div key={id} className="p-1.5 border-r border-slate-50 last:border-r-0 h-full overflow-hidden">
                                        <DroppableSlot 
                                            id={id} 
                                            category={category} 
                                            date={format(day, 'yyyy-MM-dd')}
                                            recipes={plans}
                                            onDelete={handleDeleteItem}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default ClientPortal;
