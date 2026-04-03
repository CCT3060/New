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
  endOfWeek,
  eachDayOfInterval, 
  isSameDay,
  setYear,
  getYear,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameMonth,
  addMonths
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
  Copy,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Columns,
  CheckCircle2,
  X,
  ArrowRight,
  Printer,
  IndianRupee,
  ClipboardList
} from 'lucide-react';
import { companiesApi, recipesApi, plannerApi } from '../api';
import DraggableRecipe from '../components/DraggableRecipe';
import DroppableSlot from '../components/DroppableSlot';
import toast from 'react-hot-toast';

const categories = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

const DayProcurementModal = ({ isOpen, onClose, date, companyName, plans }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && plans.length > 0) {
            generateReport();
        }
    }, [isOpen, plans]);

    const generateReport = async () => {
        setLoading(true);
        try {
            // Fetch pax reports for all recipes in the day
            const reports = await Promise.all(plans.map(p => recipesApi.getPaxReport(p.recipe_id, p.pax_count)));
            
            // Consolidate
            const consolidated = {
                date: format(parseISO(date), 'MMMM dd, yyyy'),
                total_cost: 0,
                ingredients: {}
            };

            reports.forEach(res => {
                const rep = res.data;
                consolidated.total_cost += rep.total_cost;
                rep.ingredients.forEach(ing => {
                    if (!consolidated.ingredients[ing.id]) {
                        consolidated.ingredients[ing.id] = { ...ing, recipes: [] };
                    } else {
                        consolidated.ingredients[ing.id].scaled_quantity += ing.scaled_quantity;
                        consolidated.ingredients[ing.id].line_cost += ing.line_cost;
                    }
                });
            });

            setReport(consolidated);
        } catch (error) {
            toast.error('Failed to aggregate daily requirements');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Procurement Requirement</h2>
                            <p className="text-slate-500 text-sm font-medium">{companyName} • {report?.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-100">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar print:p-0">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest leading-loose">
                            Aggregating Enterprise Requirements...<br/>
                            <span className="text-xs">Calculating Scaled Ingredient Multipliers</span>
                        </div>
                    ) : (
                        <div className="space-y-10">
                        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Daily Fulfillment</h1>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">Ingredient Breakdown for {companyName}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Headcount Logistics</span>
                                    <div className="text-4xl font-black text-slate-900 flex items-center justify-end gap-2">
                                        {plans.reduce((acc, p) => acc + (p.pax_count || 0), 0)} <span className="text-sm font-black text-slate-400">PAX</span>
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-2xl">Requirement Item</th>
                                        <th className="px-6 py-4 rounded-tr-2xl text-right">Scaled Consolidated Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.values(report?.ingredients || {}).map(ing => (
                                        <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-800 text-lg leading-none mb-1 uppercase tracking-tight">{ing.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ing.unit} System Unit</div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className="text-2xl font-black text-primary-600">{(ing.scaled_quantity).toFixed(2)}</span>
                                                <span className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{ing.unit}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td className="px-6 py-6 text-right font-black uppercase tracking-widest text-[10px] opacity-60">Total Operational Load Items</td>
                                        <td className="px-6 py-6 text-right text-3xl font-black">{Object.keys(report?.ingredients || {}).length} <span className="text-xs uppercase opacity-40">SKUs</span></td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="p-8 bg-amber-50 rounded-[2rem] border-2 border-dashed border-amber-200">
                                <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">Planned Menu for this Day</h4>
                                <div className="flex flex-wrap gap-4">
                                    {plans.map(p => (
                                        <div key={p.id} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-100 flex items-center gap-3">
                                            <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{p.category}</div>
                                            <span className="font-bold text-slate-800 text-sm">{p.recipe_name}</span>
                                            <span className="text-xs text-slate-400 border-l pl-3 ml-1">{p.pax_count} Pax</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CopyMenuModal = ({ isOpen, onClose, selectedCompany, companies, currentRange, onCopySuccess }) => {
    const [fromCompany, setFromCompany] = useState(selectedCompany?.id || '');
    const [toCompanies, setToCompanies] = useState([]);
    const [fromDate, setFromDate] = useState(format(currentRange.start, 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(currentRange.end, 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleToggleCompany = (id) => {
        if (toCompanies.includes(id)) {
            setToCompanies(toCompanies.filter(c => c !== id));
        } else {
            setToCompanies([...toCompanies, id]);
        }
    };

    const handleCopy = async () => {
        if (toCompanies.length === 0) return toast.error('Select at least one target company');
        setLoading(true);
        try {
            await plannerApi.copyRange({
                from_company_id: fromCompany,
                to_company_ids: toCompanies,
                from_date: fromDate,
                to_date: toDate
            });
            toast.success('Menu copied successfully!');
            onCopySuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Copy failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <Copy className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Replicate Experience</h2>
                            <p className="text-slate-500 text-sm font-medium">Clone menu plans across your enterprise portfolio.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-10 space-y-10">
                    <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                            <input 
                                type="date" 
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                            <input 
                                type="date" 
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 font-bold"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                Target Companies
                            </h3>
                            <button 
                                onClick={() => setToCompanies(companies.filter(c => c.id !== parseInt(fromCompany)).map(c => c.id))}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                                Select All
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {companies.filter(c => c.id !== parseInt(fromCompany)).map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => handleToggleCompany(company.id)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                                        toCompanies.includes(company.id)
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                        : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-300'
                                    }`}
                                >
                                    <span className="font-bold text-sm truncate pr-2">{company.name}</span>
                                    {toCompanies.includes(company.id) && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:bg-white transition-all">Cancel</button>
                    <button 
                        onClick={handleCopy}
                        disabled={loading}
                        className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Replicating...' : (
                            <>
                                <span>Copy Menu</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReplaceRecipeModal = ({ isOpen, onClose, originalRecipe, recipes, onReplace }) => {
    const [search, setSearch] = useState('');
    
    if (!isOpen) return null;

    const filtered = recipes.filter(r => 
        r.category_type === (originalRecipe.category_type || originalRecipe.category) &&
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Replace "{originalRecipe.recipe_name}"</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder={`Search ${originalRecipe.category} recipes...`}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary-50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.map(r => (
                        <button
                            key={r.id}
                            onClick={() => onReplace(r.id)}
                            className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-500 hover:shadow-md transition-all text-left"
                        >
                            <span className="font-bold text-slate-800">{r.name}</span>
                            <CheckCircle2 className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PlannerPage = () => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menuPlans, setMenuPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month', 'year'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [searchRecipe, setSearchRecipe] = useState('');
  const [activeBankCategory, setActiveBankCategory] = useState('All');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const currentRange = useMemo(() => {
     let start, end;
     if (viewMode === 'day') {
         start = currentDate;
         end = currentDate;
     } else if (viewMode === 'week') {
         start = startOfWeek(currentDate, { weekStartsOn: 1 });
         end = addDays(start, 6);
     } else if (viewMode === 'month') {
         start = startOfMonth(currentDate);
         end = endOfMonth(currentDate);
     } else { // year
         start = new Date(getYear(currentDate), 0, 1);
         end = new Date(getYear(currentDate), 11, 31);
     }
     return { start, end };
  }, [currentDate, viewMode]);

  const days = useMemo(() => {
      if (viewMode === 'day') return [currentDate];
      if (viewMode === 'week') return eachDayOfInterval({ start: currentRange.start, end: currentRange.end });
      return []; 
  }, [currentRange, viewMode]);

  const fetchData = async () => {
    try {
      const [cRes, rRes] = await Promise.all([companiesApi.getAll(), recipesApi.getAll()]);
      setCompanies(cRes.data);
      setRecipes(rRes.data);
      if (cRes.data.length > 0 && !selectedCompany) {
        setSelectedCompany(cRes.data[0]);
      }
    } catch (error) {
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
        start_date: format(currentRange.start, 'yyyy-MM-dd'),
        end_date: format(currentRange.end, 'yyyy-MM-dd'),
      });
      setMenuPlans(data);
    } catch (error) {
      toast.error('Failed to load menu plans');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchPlans(); }, [selectedCompany, currentRange]);

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
            category: category,
            pax_count: 10
        });
        toast.success(`Successfully added ${recipe.name}`);
        fetchPlans();
    } catch (error) {
        toast.error(`Editing Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
        await plannerApi.delete(id);
        toast.success('Deleted from menu');
        fetchPlans();
    } catch (error) {
        toast.error('Delete failed');
    }
  };

  const handleUpdatePax = async (id, pax) => {
     try {
         await plannerApi.updatePax(id, pax);
         toast.success('Pax updated');
         fetchPlans();
     } catch (e) { toast.error('Update failed'); }
  };

  const handleReplaceRecipe = async (id, new_recipe_id) => {
      try {
          await plannerApi.replaceRecipe(id, new_recipe_id);
          toast.success('Recipe replaced');
          setReplaceTarget(null);
          fetchPlans();
      } catch (e) { toast.error('Replace failed'); }
  };

  const handleClearRange = async () => {
    if (!selectedCompany) return;
    const msg = viewMode === 'day' ? 'this day' : viewMode === 'week' ? 'this week' : 'this month';
    if (!window.confirm(`Delete every item in ${msg}?`)) return;
    try {
        await plannerApi.clearWeek({
            company_id: selectedCompany.id,
            start_date: format(currentRange.start, 'yyyy-MM-dd'),
            end_date: format(currentRange.end, 'yyyy-MM-dd')
        });
        toast.success('Range cleared');
        fetchPlans();
    } catch (error) {
        toast.error('Clear failed');
    }
  };

  const handleShuffle = async () => {
    if (!selectedCompany) return;
    if (viewMode !== 'week') return toast.error('Shuffle currently only supports Weekly view');
    const loadingToast = toast.loading('Generating smart menu...');
    try {
        await plannerApi.shuffle({
            company_id: selectedCompany.id,
            start_date: format(currentRange.start, 'yyyy-MM-dd')
        });
        toast.dismiss(loadingToast);
        toast.success('Smart Shuffle Complete!');
        fetchPlans();
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error(error.response?.data?.error || 'Shuffle failed');
    }
  };

  const getPlansForSlot = (date, category) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return menuPlans.filter(plan => plan.plan_date === dateStr && plan.category === category);
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchRecipe.toLowerCase());
        const matchesCategory = activeBankCategory === 'All' || r.category_type === activeBankCategory;
        return matchesSearch && matchesCategory;
    });
  }, [recipes, searchRecipe, activeBankCategory]);

  const changeDate = (amount) => {
      if (viewMode === 'day') setCurrentDate(addDays(currentDate, amount));
      else if (viewMode === 'week') setCurrentDate(addDays(currentDate, amount * 7));
      else if (viewMode === 'month') setCurrentDate(addMonths(currentDate, amount));
      else if (viewMode === 'year') setCurrentDate(setYear(currentDate, getYear(currentDate) + amount));
  };

  const navigateToDay = (date) => {
      setCurrentDate(date);
      setViewMode('day');
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Planner Engine...</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden bg-slate-50/30">
        
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between gap-6 flex-shrink-0 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <div className="flex items-center px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 gap-3 group">
                   <Building2 className="w-4 h-4 text-primary-600 group-hover:scale-110 transition-transform" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Current Estate</span>
                      <select 
                            className="bg-transparent border-none focus:ring-0 font-black text-slate-800 p-0 text-xs cursor-pointer min-w-[120px]"
                            value={selectedCompany?.id || ''}
                            onChange={(e) => setSelectedCompany(companies.find(c => c.id === parseInt(e.target.value)))}
                       >
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                   </div>
                </div>
            </div>

            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100">
                <button onClick={() => changeDate(-1)} className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 rounded-xl shadow-sm border border-slate-100 active:scale-75 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="px-6 flex flex-col items-center justify-center relative min-w-[180px]">
                    <div className="group/date relative inline-flex flex-col items-center cursor-pointer">
                        <span className="text-[9px] font-black text-primary-600 uppercase tracking-[0.2em] mb-0.5">
                            {viewMode === 'day' ? format(currentDate, 'EEEE') : viewMode === 'week' ? `Week ${format(currentRange.start, 'w')}` : viewMode === 'month' ? format(currentDate, 'MMMM') : format(currentDate, 'yyyy')}
                        </span>
                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            {viewMode === 'day' ? format(currentDate, 'MMM dd, yyyy') : 
                             viewMode === 'week' ? `${format(currentRange.start, 'MMM dd')} — ${format(currentRange.end, 'MMM dd')}` :
                             viewMode === 'month' ? `${format(currentDate, 'MMMM yyyy')}` : `Year ${format(currentDate, 'yyyy')}`}
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        </h4>
                        <input 
                            type="date" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={(e) => {
                                if(e.target.value) setCurrentDate(parseISO(e.target.value));
                            }}
                        />
                    </div>
                </div>

                <button onClick={() => changeDate(1)} className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 rounded-xl shadow-sm border border-slate-100 active:scale-75 transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1">
                {[
                    { id: 'day', icon: Columns, label: 'Day' },
                    { id: 'week', icon: LayoutGrid, label: 'Week' },
                    { id: 'month', icon: CalendarDays, label: 'Month' },
                    { id: 'year', icon: CalendarRange, label: 'Year' }
                ].map(view => (
                    <button
                        key={view.id}
                        onClick={() => setViewMode(view.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                            viewMode === view.id 
                            ? 'bg-white text-primary-600 shadow-md border border-slate-100' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <view.icon className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{view.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100">
                <button title="Refresh" onClick={fetchPlans} className="p-2.5 hover:bg-white text-slate-400 hover:text-primary-600 rounded-xl transition-all">
                    <RotateCcw className="w-4.5 h-4.5" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button title="Clear Range" onClick={handleClearRange} className="p-2.5 hover:bg-white text-slate-400 hover:text-red-500 rounded-xl transition-all">
                    <Trash2 className="w-4.5 h-4.5" />
                </button>
                <button title="Copy Menu" onClick={() => setIsCopyModalOpen(true)} className="p-2.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                    <Copy className="w-4.5 h-4.5" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button title="Export PDF" onClick={() => window.print()} className="p-2.5 hover:bg-white text-slate-400 hover:text-rose-500 rounded-xl transition-all">
                    <FileText className="w-4.5 h-4.5" />
                </button>
             </div>
             
             {viewMode === 'week' && (
                <button 
                    onClick={handleShuffle}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all uppercase tracking-[0.2em]"
                >
                    <Shuffle className="w-4 h-4" />
                    Auto Pilot
                </button>
             )}
          </div>
        </div>

        <div className="flex-1 flex gap-5 overflow-hidden items-stretch">
          {(viewMode === 'day' || viewMode === 'week') && (
            <div className="w-80 bg-white border border-slate-100 rounded-[2rem] flex flex-col h-full shadow-lg shadow-slate-200/50">
                <div className="p-6 border-b border-slate-50">
                    <h3 className="text-sm font-black text-slate-800 flex items-center justify-between mb-5 uppercase tracking-tighter">
                        <span className="flex items-center gap-3">
                            <Utensils className="w-5 h-5 text-primary-500" />
                            Inventory Bank
                        </span>
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-500">{filteredRecipes.length}</div>
                             <button onClick={fetchData} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300">
                                <RotateCcw className="w-4 h-4" />
                             </button>
                        </div>
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text" 
                                placeholder="Search inventory..." 
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:bg-white focus:border-primary-300 transition-all font-bold shadow-inner"
                                value={searchRecipe}
                                onChange={(e) => setSearchRecipe(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-2xl">
                            {['All', ...categories].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveBankCategory(cat)}
                                    className={`flex-1 px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all ${
                                        activeBankCategory === cat 
                                        ? 'bg-white text-primary-600 shadow-sm border border-slate-100' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {cat === 'Evening Snacks' ? 'Snacks' : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/10">
                    {filteredRecipes.map(recipe => (
                        <DraggableRecipe key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            </div>
          )}

          <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full print:border-none print:shadow-none">
            
            {viewMode === 'week' && (
                <>
                <div className="grid grid-cols-[140px_repeat(7,1fr)] bg-slate-50/50 border-b border-slate-100 flex-shrink-0">
                    <div className="p-4 border-r border-slate-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</span>
                    </div>
                    {days.map(day => (
                        <div key={day.toString()} className={`p-4 text-center border-r border-slate-100 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary-50/50' : ''}`}>
                            <p className={`text-[10px] uppercase font-black tracking-[0.2em] ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-slate-400'}`}>
                                {format(day, 'EEE')}
                            </p>
                            <p className={`text-2xl font-black ${isSameDay(day, new Date()) ? 'text-primary-700' : 'text-slate-800'}`}>
                                {format(day, 'dd')}
                            </p>
                        </div>
                    ))}
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div className="flex flex-col min-h-full w-max xl:w-full">
                        {categories.map(category => (
                            <div key={category} className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0 min-h-[140px]">
                                <div className="p-6 border-r border-slate-100 bg-slate-50/30 flex flex-col justify-center items-center gap-3 group/row relative">
                                    <Utensils className="w-5 h-5 text-slate-300 group-hover/row:text-primary-500 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase text-center leading-tight tracking-[0.2em]">
                                        {category === 'Evening Snacks' ? 'Snacks' : category}
                                    </span>
                                </div>
                                {days.map(day => {
                                    const plans = getPlansForSlot(day, category);
                                    const id = `slot-${format(day, 'yyyy-MM-dd')}-${category}`;
                                    return (
                                        <div key={id} className="p-3 border-r border-slate-50 last:border-r-0 h-full">
                                            <DroppableSlot 
                                                id={id} 
                                                category={category} 
                                                date={format(day, 'yyyy-MM-dd')}
                                                recipes={plans}
                                                onDelete={handleDeleteItem}
                                                onUpdatePax={handleUpdatePax}
                                                onReplace={(recipe) => setReplaceTarget(recipe)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                </>
            )}

            {viewMode === 'day' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-primary-600 rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-primary-200">
                                <span className="text-xs font-black uppercase tracking-tighter opacity-70">{format(currentDate, 'EEE')}</span>
                                <span className="text-3xl font-black">{format(currentDate, 'dd')}</span>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{format(currentDate, 'MMMM yyyy')}</h2>
                                <p className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Full Capacity Daily Operations
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsProcurementModalOpen(true)}
                            className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-[11px]"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Procurement Report
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8 custom-scrollbar">
                        {categories.map(cat => (
                            <div key={cat} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-xl"><Utensils className="w-5 h-5 text-slate-400" /></div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{cat}</h3>
                                </div>
                                <DroppableSlot 
                                    id={`day-slot-${cat}`}
                                    category={cat}
                                    date={format(currentDate, 'yyyy-MM-dd')}
                                    recipes={getPlansForSlot(currentDate, cat)}
                                    onDelete={handleDeleteItem}
                                    onUpdatePax={handleUpdatePax}
                                    onReplace={(recipe) => setReplaceTarget(recipe)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'month' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-900 text-[10px] font-black uppercase text-white tracking-[0.2em] border-b border-slate-800">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="p-4 text-center border-r border-slate-800 last:border-r-0">{d}</div>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-7 h-full">
                            {(() => {
                                const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
                                const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
                                const monthDays = eachDayOfInterval({ start, end });
                                return monthDays.map(day => {
                                    const plans = menuPlans.filter(p => isSameDay(parseISO(p.plan_date), day));
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    return (
                                        <div 
                                            key={day.toString()} 
                                            onClick={() => navigateToDay(day)}
                                            className={`min-h-[140px] p-4 border-r border-b border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group ${!isCurrentMonth ? 'bg-slate-50/50 grayscale opacity-40' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-lg font-black ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-slate-800'}`}>
                                                    {format(day, 'dd')}
                                                </span>
                                                {plans.length > 0 && <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>}
                                            </div>
                                            <div className="space-y-1.5">
                                                {plans.slice(0, 4).map(p => (
                                                    <div key={p.id} className="text-[8px] font-black text-slate-500 uppercase bg-slate-100 p-1 rounded truncate flex items-center gap-1 border border-slate-200">
                                                        <div className={`w-1 h-3 rounded-full ${
                                                            p.category === 'Lunch' ? 'bg-blue-400' : p.category === 'Dinner' ? 'bg-purple-400' : 'bg-amber-400'
                                                        }`}></div>
                                                        {p.recipe_name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'year' && (
               <div className="flex-1 overflow-y-auto p-10 grid grid-cols-4 gap-10 custom-scrollbar bg-slate-50/20">
                  {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(getYear(currentDate), i, 1);
                      const monthPlans = menuPlans.filter(p => isSameMonth(parseISO(p.plan_date), monthDate));
                      const activeDays = new Set(monthPlans.map(p => p.plan_date)).size;
                      return (
                          <div 
                            key={i} 
                            onClick={() => {
                                setCurrentDate(monthDate);
                                setViewMode('month');
                            }}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                          >
                             <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1">{format(monthDate, 'MMMM')}</h4>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Engagement Capacity</p>
                             <div className="flex items-end gap-1 h-12 mb-6">
                                {Array.from({ length: 10 }).map((_, bi) => {
                                    const fill = (activeDays / 31) * 10;
                                    return (
                                        <div key={bi} className={`flex-1 rounded-sm ${bi < fill ? 'bg-primary-600' : 'bg-slate-100'}`}></div>
                                    );
                                })}
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Operations</span>
                                <span className="text-lg font-black text-primary-600">{activeDays} Days</span>
                             </div>
                          </div>
                      );
                  })}
               </div>
            )}
          </div>
        </div>
      </div>

      <CopyMenuModal 
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        selectedCompany={selectedCompany}
        companies={companies}
        currentRange={currentRange}
        onCopySuccess={fetchPlans}
      />

      <DayProcurementModal 
        isOpen={isProcurementModalOpen}
        onClose={() => setIsProcurementModalOpen(false)}
        date={format(currentDate, 'yyyy-MM-dd')}
        companyName={selectedCompany?.name}
        plans={menuPlans.filter(p => p.plan_date === format(currentDate, 'yyyy-MM-dd'))}
      />

      {replaceTarget && (
          <ReplaceRecipeModal 
            isOpen={!!replaceTarget}
            onClose={() => setReplaceTarget(null)}
            originalRecipe={replaceTarget}
            recipes={recipes}
            onReplace={(new_id) => handleReplaceRecipe(replaceTarget.id, new_id)}
          />
      )}
    </DndContext>
  );
};

export default PlannerPage;
