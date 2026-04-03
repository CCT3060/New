import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Beef, IndianRupee, CheckCircle2, XCircle, Power } from 'lucide-react';
import { ingredientsApi } from '../api';
import toast from 'react-hot-toast';

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({ name: '', unit: 'kg', cost_per_unit: 0, is_active: 1 });

  const fetchIngredients = async () => {
    try {
      const { data } = await ingredientsApi.getAll();
      setIngredients(data);
    } catch (error) {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        is_active: formData.is_active ? 1 : 0
      };
      if (editingIngredient) {
        await ingredientsApi.update(editingIngredient.id, dataToSubmit);
        toast.success('Ingredient updated');
      } else {
        await ingredientsApi.create(dataToSubmit);
        toast.success('Ingredient added');
      }
      setIsModalOpen(false);
      setEditingIngredient(null);
      setFormData({ name: '', unit: 'kg', cost_per_unit: 0, is_active: 1 });
      fetchIngredients();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
        const newStatus = item.is_active ? 0 : 1;
        await ingredientsApi.update(item.id, {
            ...item,
            is_active: newStatus
        });
        toast.success(`Ingredient ${newStatus ? 'activated' : 'deactivated'}`);
        fetchIngredients();
    } catch (e) {
        toast.error('Status update failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this ingredient?')) {
      try {
        await ingredientsApi.delete(id);
        toast.success('Deleted');
        fetchIngredients();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ingredients Master</h1>
          <p className="text-slate-500">Manage ingredients, units, and estimated costs.</p>
        </div>
        <button
          onClick={() => {
            setEditingIngredient(null);
            setFormData({ name: '', unit: 'kg', cost_per_unit: 0, is_active: 1 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Add Ingredient
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          className="flex-1 border-none focus:ring-0 text-slate-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Ingredient Name</th>
              <th className="px-6 py-4">Unit</th>
              <th className="px-6 py-4">Cost / Unit</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading...</td>
              </tr>
            ) : filteredIngredients.map((item) => (
              <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${!item.is_active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center`}>
                    <Beef className="w-4 h-4" />
                  </div>
                  <span className={`font-medium ${item.is_active ? 'text-slate-700' : 'text-slate-400 italic'}`}>{item.name}</span>
                </td>
                <td className="px-6 py-4 text-slate-500">{item.unit}</td>
                <td className="px-6 py-4 text-slate-700 font-bold">
                  <span className="flex items-center gap-0.5">
                    <IndianRupee className="w-3 h-3 text-slate-400" />
                    {item.cost_per_unit || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-slate-400">
                    <button 
                      onClick={() => handleToggleStatus(item)}
                      title={item.is_active ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded-lg transition-all ${
                          item.is_active 
                          ? 'hover:text-amber-600 hover:bg-amber-50' 
                          : 'hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <Power className={`w-4 h-4 ${item.is_active ? 'rotate-0' : 'rotate-180 opacity-50'}`} />
                    </button>
                    <div className="w-px h-4 bg-slate-100 mx-1"></div>
                    <button 
                      onClick={() => {
                        setEditingIngredient(item);
                        setFormData({ 
                            name: item.name, 
                            unit: item.unit, 
                            cost_per_unit: item.cost_per_unit || 0,
                            is_active: !!item.is_active
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Potato, Chicken, Basmati Rice"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Unit</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pkt">Packet (pkt)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cost per {formData.unit}</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                          <Power className="w-4 h-4" />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-slate-700">Active Status</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{formData.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`}></div>
                  </button>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 mt-4"
              >
                {editingIngredient ? 'Save Changes' : 'Add Ingredient'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsPage;
