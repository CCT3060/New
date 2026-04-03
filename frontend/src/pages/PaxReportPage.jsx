import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { 
  Building2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  IndianRupee, 
  Printer, 
  ClipboardList,
  Plus,
  RefreshCw,
  X,
  Target,
  CheckCircle2,
  ChevronRightSquare,
  Edit,
  ArrowRightLeft
} from 'lucide-react';
import { companiesApi, plannerApi, recipesApi } from '../api';
import toast from 'react-hot-toast';

const categories = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

const ChangeRecipeModal = ({ isOpen, onClose, currentCategory, onSelect }) => {
    const [recipes, setRecipes] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            recipesApi.getAll().then(res => {
                setRecipes(res.data.filter(r => r.category_type === currentCategory));
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[60vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Change Recipe</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-4 border-b border-slate-50 bg-slate-50/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="text"
                            placeholder="Find replacement..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary-50 text-sm font-bold"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? <div className="p-8 text-center animate-pulse text-xs font-black text-slate-300 uppercase tracking-widest">Loading Catalog...</div> : 
                        filtered.map(r => (
                            <button
                                key={r.id}
                                onClick={() => onSelect(r.id)}
                                className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-500 hover:bg-primary-50/30 transition-all text-left group"
                            >
                                <span className="font-bold text-slate-700">{r.name}</span>
                                <CheckCircle2 className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100" />
                            </button>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

const PaxEditModal = ({ isOpen, onClose, plan, onUpdate }) => {
    const [pax, setPax] = useState(plan?.pax_count || 10);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);

    useEffect(() => {
        if (isOpen && plan) {
            setPax(plan.pax_count);
            fetchReport(plan.pax_count);
        }
    }, [isOpen, plan]);

    const fetchReport = async (p) => {
        if (!plan?.recipe_id) return;
        setLoading(true);
        try {
            const { data } = await recipesApi.getPaxReport(plan.recipe_id, p);
            setReport(data);
        } catch (e) {
            toast.error('Failed to scale ingredients');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            await plannerApi.updatePax(plan.id, pax);
            toast.success('Requirement Saved');
            onUpdate();
            onClose();
        } catch (e) {
            toast.error('Update failed');
        }
    };

    const handleSwapRecipe = async (newId) => {
        try {
            await plannerApi.replaceRecipe(plan.id, newId);
            toast.success('Recipe Updated');
            setIsSwapping(false);
            onUpdate();
            onClose();
        } catch (e) { toast.error('Update failed'); }
    }

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{plan.recipe_name}</h2>
                                <button onClick={() => setIsSwapping(true)} title="Swap Recipe" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-all">
                                    <ArrowRightLeft className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{plan.company_name} • {plan.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="p-8 flex gap-8 overflow-hidden h-[450px]">
                    <div className="w-1/3 flex flex-col justify-between h-full">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Daily Headcount</label>
                            <input 
                                type="number" 
                                className="w-full text-5xl font-black text-primary-600 bg-transparent border-none focus:ring-0 p-0 mb-4"
                                value={pax}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setPax(val);
                                    fetchReport(val);
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setPax(pax + 10); fetchReport(pax + 10); }} className="flex-1 py-3 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-100 hover:border-primary-300 active:scale-95 transition-all shadow-sm">+10</button>
                                <button onClick={() => { setPax(Math.max(1, pax - 10)); fetchReport(Math.max(1, pax - 10)); }} className="flex-1 py-3 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-100 hover:border-primary-300 active:scale-95 transition-all shadow-sm">-10</button>
                            </div>
                        </div>
                        <button 
                            onClick={handleUpdate}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                        >
                            Commit Pax Update
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden flex flex-col shadow-inner">
                        <div className="p-4 border-b border-slate-100 bg-white/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scaling Logix Engine</span>
                            <div className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[8px] font-black uppercase rounded-lg">Forecasting</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {loading ? (
                                <div className="h-full flex items-center justify-center animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest">Recalculating Multipliers...</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
                                        <tr>
                                            <th className="pb-3 text-left">Scaled Ingredient Item</th>
                                            <th className="pb-3 text-right">Required Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {report?.ingredients.map(ing => (
                                            <tr key={ing.id} className="group">
                                                <td className="py-3 text-[11px] font-bold text-slate-700 leading-tight">
                                                    {ing.name}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="text-sm font-black text-slate-900 tracking-tighter">{ing.scaled_quantity.toFixed(2)}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1.5 opacity-60 tracking-widest">{ing.unit}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <ChangeRecipeModal 
            isOpen={isSwapping}
            onClose={() => setIsSwapping(false)}
            currentCategory={plan.category}
            onSelect={handleSwapRecipe}
        />
        </>
    );
};

const MultiAssignModal = ({ isOpen, onClose, context, companies, onUpdate }) => {
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [pax, setPax] = useState(10);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && context) {
            setSelectedCompanies([context.initialCompanyId]);
            fetchReport(pax);
        }
    }, [isOpen, context]);

    const fetchReport = async (p) => {
        if (!context?.recipeId) return;
        setLoading(true);
        try {
            const { data } = await recipesApi.getPaxReport(context.recipeId, p);
            setReport(data);
        } catch (e) {
            toast.error('Failed to scale ingredients');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCompany = (id) => {
        if (selectedCompanies.includes(id)) {
            setSelectedCompanies(selectedCompanies.filter(c => c !== id));
        } else {
            setSelectedCompanies([...selectedCompanies, id]);
        }
    };

    const handleAssign = async () => {
        if (selectedCompanies.length === 0) return toast.error('Select at least one company');
        try {
            await plannerApi.assignBatch({
                company_ids: selectedCompanies,
                recipe_id: context.recipeId,
                plan_date: context.date,
                category: context.category,
                pax_count: pax
            });
            toast.success('Portfolio Updated Successfully');
            onUpdate();
            onClose();
        } catch (e) {
            toast.error('Batch update failed');
        }
    };

    if (!isOpen) return null;

    const availableCompanies = companies.filter(c => !context.alreadyAssignedIds.includes(c.id));

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Enterprise Replicator</h2>
                            <p className="text-slate-500 text-sm font-medium">Clone {context.recipeName} across your multi-company ecosystem.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 flex gap-10 overflow-hidden h-[500px]">
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-hidden flex flex-col mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Target Estates</h3>
                                <button 
                                    onClick={() => setSelectedCompanies(availableCompanies.map(c => c.id))}
                                    className="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg"
                                >
                                    Force All
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                {availableCompanies.map(company => (
                                    <button
                                        key={company.id}
                                        onClick={() => handleToggleCompany(company.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                                            selectedCompanies.includes(company.id)
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                                            : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Building2 className={`w-3.5 h-3.5 ${selectedCompanies.includes(company.id) ? 'text-indigo-200' : 'text-slate-300'}`} />
                                            <span className="font-bold text-sm tracking-tight">{company.name}</span>
                                        </div>
                                        {selectedCompanies.includes(company.id) && <CheckCircle2 className="w-4 h-4 text-indigo-100" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mb-0">
                           <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Headcount</label>
                                <span className="text-[9px] font-black text-indigo-600 bg-white px-2 py-1 rounded-lg border border-slate-100">{selectedCompanies.length} Estates</span>
                           </div>
                           <input 
                                type="number" 
                                className="w-full text-5xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 mb-4"
                                value={pax}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setPax(val);
                                    fetchReport(val);
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setPax(pax + 10); fetchReport(pax + 10); }} className="flex-1 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all shadow-sm">+10 Pax</button>
                                <button onClick={() => { setPax(Math.max(1, pax - 10)); fetchReport(Math.max(1, pax - 10)); }} className="flex-1 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all shadow-sm">-10 Pax</button>
                            </div>
                        </div>
                    </div>

                    <div className="w-[380px] bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl">
                        <div className="mb-10">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Enterprise Deployment Catalog</span>
                            <h4 className="text-2xl font-black mt-1 text-white uppercase tracking-tighter leading-tight">{context.recipeName}</h4>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-indigo-300 tracking-widest border border-white/5">{context.category}</span>
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-300 tracking-widest border border-white/5">{format(parseISO(context.date), 'dd MMM yyyy')}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block border-b border-white/10 pb-2">Forecasting Scaled Ingredient Load</span>
                            <div className="flex-1 overflow-y-auto custom-scrollbar-dark pr-4 space-y-5">
                                {loading ? (
                                    <div className="h-40 flex items-center justify-center animate-pulse text-[10px] font-black text-slate-600 uppercase tracking-widest">Hydrating Scales...</div>
                                ) : (
                                    report?.ingredients.map(ing => (
                                        <div key={ing.id} className="flex items-start justify-between group border-b border-white/5 pb-4 last:border-b-0">
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{ing.name}</p>
                                                <p className="text-[9px] font-black text-slate-500 uppercase mt-0.5 tracking-widest">Base Unit: {ing.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-indigo-400 leading-none">{(ing.scaled_quantity).toFixed(2)}</p>
                                                <span className="text-[9px] font-black text-slate-500 uppercase">{ing.unit}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Deployment Velocity</span>
                            </div>
                            <div className="text-3xl font-black text-white flex items-baseline gap-2">
                                {selectedCompanies.length} <span className="text-sm text-slate-400">Target Locations</span>
                            </div>
                        </div>

                        <div className="mt-8">
                             <button 
                                onClick={handleAssign}
                                className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-slate-100 hover:-translate-y-1 active:translate-y-0 transition-all uppercase"
                            >
                                Replicate Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaxReportPage = () => {
    const [companies, setCompanies] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
    const [editingPlan, setEditingPlan] = useState(null);
    const [assignContext, setAssignContext] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, pRes] = await Promise.all([
                companiesApi.getAll(),
                plannerApi.getPlansAll({ start_date: startDate, end_date: endDate })
            ]);
            setCompanies(cRes.data);
            setPlans(pRes.data);
        } catch (error) {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [startDate, endDate]);

    const matrix = useMemo(() => {
        const data = {};
        plans.forEach(p => {
            const dayKey = p.plan_date;
            if (!data[dayKey]) data[dayKey] = {};
            if (!data[dayKey][p.category]) data[dayKey][p.category] = {};
            if (!data[dayKey][p.category][p.recipe_id]) {
                data[dayKey][p.category][p.recipe_id] = {
                    id: p.recipe_id,
                    name: p.recipe_name,
                    category: p.category,
                    date: p.plan_date,
                    plans: {} 
                };
            }
            data[dayKey][p.category][p.recipe_id].plans[p.company_id] = p;
        });
        return data;
    }, [plans]);

    const dates = useMemo(() => {
        return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    }, [startDate, endDate]);

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden">
            {/* Header / Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between gap-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-100 text-primary-600 rounded-2xl flex-shrink-0">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase truncate">Pax Count Report</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest truncate hidden sm:block">Multi-Company Ingredient Forecasting Matrix</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                            <input 
                                type="date" 
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-slate-700 p-0 w-24 sm:w-28"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="px-2 text-slate-400 font-bold uppercase text-[9px]">to</div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                            <input 
                                type="date" 
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-slate-700 p-0 w-24 sm:w-28"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <button onClick={fetchData} className="p-3 hover:bg-slate-50 transition-colors text-slate-400 hover:text-primary-600 flex-shrink-0">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    
                    <button onClick={() => window.print()} className="hidden lg:flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex-shrink-0">
                        <Printer className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col relative print:border-none print:shadow-none min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed lg:table-auto">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-900 text-white border-b border-slate-800">
                                <th className="px-6 py-5 min-w-[200px] w-[250px] font-black uppercase tracking-widest text-[9px] text-slate-400 border-r border-slate-800">Operational Item</th>
                                <th className="px-6 py-5 min-w-[120px] w-[140px] font-black uppercase tracking-widest text-[9px] text-slate-400 border-r border-slate-800 text-center">Category</th>
                                <th className="px-6 py-5 min-w-[80px] w-[80px] font-black uppercase tracking-widest text-[9px] text-slate-400 border-r border-slate-800 text-center">UOM</th>
                                {companies.map(c => (
                                    <th key={c.id} className="px-6 py-5 text-center font-black uppercase tracking-widest text-[9px] border-r border-slate-800 min-w-[140px] truncate">{c.name}</th>
                                ))}
                                <th className="px-6 py-5 text-center font-black uppercase tracking-widest text-[9px] bg-primary-600 text-white min-w-[120px]">Total Pax</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={companies.length + 4} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.3em] text-sm animate-pulse">Synchronizing Multi-Enterprise Matrix...</td>
                                </tr>
                            ) : dates.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayData = matrix[dateStr];
                                if (!dayData) return null;

                                return (
                                    <React.Fragment key={dateStr}>
                                        <tr className="bg-slate-800 text-white shadow-inner">
                                            <td colSpan={companies.length + 4} className="px-8 py-3 font-black uppercase tracking-[0.2em] text-[10px]">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-3.5 h-3.5 text-primary-400" />
                                                    {format(day, 'dd LLLL yyyy')} — <span className="text-primary-400">{format(day, 'EEEE')}</span>
                                                </div>
                                            </td>
                                        </tr>

                                        {categories.map(cat => {
                                            const catData = dayData[cat];
                                            if (!catData) return null;

                                            return (
                                                <React.Fragment key={`${dateStr}-${cat}`}>
                                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                                        <td colSpan={companies.length + 4} className="px-10 py-2.5 font-black uppercase tracking-[0.2em] text-[8px] text-slate-400">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                                {cat === 'Evening Snacks' ? 'Tea & Snacks' : cat}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {Object.values(catData).map(recipe => {
                                                        let totalPax = 0;
                                                        const recipePlans = recipe.plans;
                                                        const alreadyAssignedIds = Object.keys(recipePlans).map(Number);

                                                        return (
                                                            <tr key={`${dateStr}-${cat}-${recipe.id}`} className="hover:bg-slate-50/80 transition-all group">
                                                                <td className="px-6 py-4 border-r border-slate-50 bg-white/50 backdrop-blur-sm sticky left-0 z-[5] md:relative md:z-0">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-slate-800 text-[13px] tracking-tight hover:text-primary-600 cursor-pointer flex items-center gap-2 group/title">
                                                                            {recipe.name}
                                                                            <Edit className="w-3 h-3 opacity-0 group-hover/title:opacity-100 text-slate-300" />
                                                                        </span>
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Verified Production Item</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center border-r border-slate-50 bg-slate-50/10">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50">{cat === 'Evening Snacks' ? 'Snacks' : cat}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center border-r border-slate-50">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">kg</span>
                                                                </td>
                                                                {companies.map(company => {
                                                                    const plan = recipePlans[company.id];
                                                                    if (plan) totalPax += plan.pax_count;
                                                                    return (
                                                                        <td key={company.id} className="px-6 py-4 text-center border-r border-slate-50">
                                                                            {plan ? (
                                                                                <button 
                                                                                    onClick={() => setEditingPlan(plan)}
                                                                                    className="group/pax relative px-5 py-2.5 bg-white rounded-2xl hover:bg-slate-900 hover:text-white transition-all w-full flex items-center justify-center gap-2 border border-slate-100 hover:border-slate-900 shadow-sm hover:shadow-xl active:scale-95"
                                                                                >
                                                                                    <span className="text-sm font-black tracking-tighter">{plan.pax_count}</span>
                                                                                    <div className="flex flex-col items-start translate-x-1 sm:translate-x-0">
                                                                                         <span className="text-[7px] font-black uppercase opacity-40 leading-none group-hover/pax:text-white">Pax</span>
                                                                                    </div>
                                                                                </button>
                                                                            ) : (
                                                                                <button 
                                                                                    onClick={() => setAssignContext({
                                                                                        recipeId: recipe.id,
                                                                                        recipeName: recipe.name,
                                                                                        category: cat,
                                                                                        date: dateStr,
                                                                                        initialCompanyId: company.id,
                                                                                        alreadyAssignedIds: alreadyAssignedIds
                                                                                    })}
                                                                                    className="p-3 bg-slate-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all active:scale-90 opacity-100 flex items-center justify-center mx-auto w-12 h-12 sm:w-full"
                                                                                >
                                                                                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-6 py-4 text-center bg-primary-600 text-white font-black text-lg shadow-inner">
                                                                    {totalPax}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingPlan && (
                <PaxEditModal 
                    isOpen={!!editingPlan}
                    onClose={() => setEditingPlan(null)}
                    plan={editingPlan}
                    onUpdate={fetchData}
                />
            )}

            {assignContext && (
                <MultiAssignModal 
                    isOpen={!!assignContext}
                    onClose={() => setAssignContext(null)}
                    context={assignContext}
                    companies={companies}
                    onUpdate={fetchData}
                />
            )}
        </div>
    );
};

export default PaxReportPage;
