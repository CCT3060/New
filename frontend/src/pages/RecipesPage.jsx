import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, UtensilsCrossed, Beef } from 'lucide-react';
import { recipesApi, ingredientsApi } from '../api';
import toast from 'react-hot-toast';

const RecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_type: 'Lunch', // Breakfast, Lunch, Dinner, Evening Snacks
    ingredients: [] // { ingredient_id: 1, name: 'Potato', unit: 'kg', quantity: 2 }
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
      if (editingRecipe) {
        await recipesApi.update(editingRecipe.id, formData);
        toast.success('Recipe updated');
      } else {
        await recipesApi.create(formData);
        toast.success('Recipe created');
      }
      setIsModalOpen(false);
      setEditingRecipe(null);
      setFormData({ name: '', description: '', category_type: 'Lunch', ingredients: [] });
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
          <p className="text-slate-500">Create and manage recipes with detailed ingredient mapping.</p>
        </div>
        <button
          onClick={() => {
            setEditingRecipe(null);
            setFormData({ name: '', description: '', category_type: 'Lunch', ingredients: [] });
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
          <div key={recipe.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden">
            <div className="p-6">
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ingredients</p>
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
                <div className="space-y-2">
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
    </div>
  );
};

export default RecipesPage;
