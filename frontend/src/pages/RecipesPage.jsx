import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, UtensilsCrossed, Beef, Calculator, Printer, IndianRupee } from 'lucide-react';
import { recipesApi, ingredientsApi } from '../api';
import toast from 'react-hot-toast';

const PaxCalculatorModal = ({ recipe, onClose }) => {
  const [pax, setPax] = useState(10);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await recipesApi.getPaxReport(recipe.id, pax);
      setReport(data);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [recipe.id, pax]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:static">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Pax Calculator & Detailed Report</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 print:p-0">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
            <div className="flex-1">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 block">Enterprise Pax Count</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  className="w-32 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-primary-600 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none transition-all"
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                />
                <span className="text-slate-500 font-medium text-lg">People</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">Based on recipe serves: {recipe.base_serves || 1} people</p>
            </div>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl hover:bg-slate-900 transition-all font-bold shadow-lg shadow-slate-200 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>

          {/* Report Content */}
          <div id="pax-report-content" className="space-y-8">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{recipe.name}</h1>
                <p className="text-slate-500 mt-1">{recipe.category_type} • Dynamic Ingredient Forecast</p>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl inline-block mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total Cost Estimate</span>
                  <p className="text-2xl font-black flex items-center justify-end gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {report?.total_cost?.toLocaleString()}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pax} PAX REPORT • {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Pax</p>
                <p className="text-2xl font-black text-slate-800">{pax}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Scale Multiplier</p>
                <p className="text-2xl font-black text-primary-600">x{report?.multiplier}</p>
              </div>
              <div className="bg-primary-600 p-4 rounded-2xl text-white shadow-lg shadow-primary-100">
                <p className="text-[10px] font-black opacity-60 uppercase mb-1">Cost Per Pax</p>
                <p className="text-2xl font-black flex items-center gap-1">
                  <IndianRupee className="w-5 h-5" />
                  {report?.total_cost ? (report.total_cost / pax).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-3xl mt-4">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Ingredient</th>
                    <th className="px-6 py-4">Base Qty (per {recipe.base_serves})</th>
                    <th className="px-6 py-4 bg-primary-700">Required Qty ({pax} Pax)</th>
                    <th className="px-6 py-4">Cost / Unit</th>
                    <th className="px-6 py-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report?.ingredients.map((ing) => (
                    <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{ing.name}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{ing.unit}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {ing.base_quantity} {ing.unit}
                      </td>
                      <td className="px-6 py-4 bg-primary-50/30">
                        <span className="font-black text-primary-700 text-lg">{ing.scaled_quantity}</span>
                        <span className="ml-1 text-slate-400 text-xs font-bold uppercase">{ing.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                         ₹ {ing.cost_per_unit || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                         ₹ {ing.line_cost?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/50">
                  <tr>
                    <td colSpan="4" className="px-6 py-6 text-right font-black text-slate-600 uppercase tracking-widest text-xs">Total Ingredient Cost Forecast</td>
                    <td className="px-6 py-6 text-right text-2xl font-black text-slate-900">₹ {report?.total_cost?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaxModalOpen, setIsPaxModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [selectedRecipeForPax, setSelectedRecipeForPax] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_type: 'Lunch', 
    base_serves: 1,
    ingredients: [] 
  });

  const fetchAll = async () => {
    try {
      const [rRes, iRes] = await Promise.all([recipesApi.getAll(), ingredientsApi.getAll()]);
      setRecipes(rRes.data);
      setIngredients(iRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addIngredientToRecipe = (ingredient) => {
    if (formData.ingredients.find(i => i.ingredient_id === ingredient.id)) {
      toast.error('Ingredient already added');
      return;
    }
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { 
        ingredient_id: ingredient.id, 
        name: ingredient.name, 
        unit: ingredient.unit, 
        quantity: 1 
      }]
    });
  };

  const removeIngredientFromRecipe = (id) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter(i => i.ingredient_id !== id)
    });
  };

  const updateQuantity = (id, val) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.map(i => 
        i.ingredient_id === id ? { ...i, quantity: parseFloat(val) || 0 } : i
      )
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }
    try {
      const dataToSubmit = {
        ...formData,
        base_serves: parseInt(formData.base_serves) || 1
      };
      if (editingRecipe) {
        await recipesApi.update(editingRecipe.id, dataToSubmit);
        toast.success('Recipe updated');
      } else {
        await recipesApi.create(dataToSubmit);
        toast.success('Recipe created');
      }
      setIsModalOpen(false);
      setEditingRecipe(null);
      setFormData({ name: '', description: '', category_type: 'Lunch', base_serves: 1, ingredients: [] });
      fetchAll();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this recipe?')) {
      try {
        await recipesApi.delete(id);
        toast.success('Deleted');
        fetchAll();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recipe Inventory</h1>
          <p className="text-slate-500">Create and manage recipes with detailed ingredient mapping and pax scaling.</p>
        </div>
        <button
          onClick={() => {
            setEditingRecipe(null);
            setFormData({ name: '', description: '', category_type: 'Lunch', base_serves: 1, ingredients: [] });
            setIngredientSearch('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
        >
          <Plus className="w-5 h-5" />
          Create Recipe
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search recipes..."
          className="flex-1 border-none focus:ring-0 text-slate-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading recipes...</div>
        ) : filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  recipe.category_type === 'Breakfast' ? 'bg-amber-100 text-amber-700' :
                  recipe.category_type === 'Lunch' ? 'bg-blue-100 text-blue-700' :
                  recipe.category_type === 'Evening Snacks' ? 'bg-orange-100 text-orange-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {recipe.category_type}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                        setEditingRecipe(recipe);
                        setFormData({ 
                            name: recipe.name, 
                            description: recipe.description || '', 
                            category_type: recipe.category_type,
                            base_serves: recipe.base_serves || 1,
                            ingredients: recipe.ingredients.map(i => ({
                                ingredient_id: i.id,
                                name: i.name,
                                unit: i.unit,
                                quantity: i.quantity
                            }))
                        });
                        setIngredientSearch('');
                        setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(recipe.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">{recipe.name}</h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{recipe.description || 'No description available.'}</p>
              
              <div className="mt-6 pt-6 border-t border-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Core Ingredients (Serves {recipe.base_serves})</p>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.slice(0, 3).map(i => (
                    <span key={i.id} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600">
                      {i.name} ({i.quantity} {i.unit})
                    </span>
                  ))}
                  {recipe.ingredients.length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-400">
                      +{recipe.ingredients.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => {
                      setSelectedRecipeForPax(recipe);
                      setIsPaxModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:border-primary-300 hover:text-primary-600 transition-all shadow-sm active:scale-95"
                >
                    <Calculator className="w-4 h-4" />
                    Pax Calculator
                </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left: Recipe Info */}
              <div className="flex-1 p-8 overflow-y-auto border-r border-slate-50 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Recipe Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Category Type</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all"
                            value={formData.category_type}
                            onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                        >
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Dinner">Dinner</option>
                            <option value="Evening Snacks">Evening Snacks</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Base Serves (People)</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all"
                            value={formData.base_serves}
                            onChange={(e) => setFormData({ ...formData, base_serves: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Instructions / Description</label>
                  <textarea
                    rows="3"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Added Ingredients</h3>
                  {formData.ingredients.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400">
                      No ingredients added yet. Select from the right.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.ingredients.map(item => (
                        <div key={item.ingredient_id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                          <div className="flex-1 font-medium text-slate-700">{item.name}</div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              step="0.01"
                              className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-center"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.ingredient_id, e.target.value)}
                            />
                            <span className="text-sm text-slate-500 w-8">{item.unit}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeIngredientFromRecipe(item.ingredient_id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Ingredient Picker */}
              <div className="w-full md:w-80 bg-slate-50/50 p-6 overflow-y-auto flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Find ingredients..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                  {ingredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase())).map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => addIngredientToRecipe(i)}
                      className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl text-left hover:border-amber-500 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                          <Beef className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{i.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{i.unit}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-amber-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all"
              >
                {editingRecipe ? 'Save Changes' : 'Create Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaxModalOpen && selectedRecipeForPax && (
          <PaxCalculatorModal 
            recipe={selectedRecipeForPax} 
            onClose={() => {
                setIsPaxModalOpen(false);
                setSelectedRecipeForPax(null);
            }} 
          />
      )}
    </div>
  );
};

export default RecipesPage;
