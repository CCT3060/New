import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Building2 } from 'lucide-react';
import { companiesApi } from '../api';
import toast from 'react-hot-toast';

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({ name: '', logo_url: '', description: '' });

  const fetchCompanies = async () => {
    try {
      const { data } = await companiesApi.getAll();
      setCompanies(data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await companiesApi.update(editingCompany.id, formData);
        toast.success('Company updated successfully');
      } else {
        await companiesApi.create(formData);
        toast.success('Company created successfully');
      }
      setIsModalOpen(false);
      setEditingCompany(null);
      setFormData({ name: '', logo_url: '', description: '' });
      fetchCompanies();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companiesApi.delete(id);
        toast.success('Company deleted');
        fetchCompanies();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({ name: company.name, logo_url: company.logo_url || '', description: company.description || '' });
    setIsModalOpen(true);
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Management</h1>
          <p className="text-slate-500">Manage all registered companies in the system.</p>
        </div>
        <button
          onClick={() => {
            setEditingCompany(null);
            setFormData({ name: '', logo_url: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search companies..."
          className="flex-1 border-none focus:ring-0 text-slate-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-6 h-6" />
                    )}
                  </div>
                  <span className="absolute -top-2 -left-2 bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                    ID: {company.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(company)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(company.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-800">{company.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{company.description || 'No description provided.'}</p>
              </div>
            </div>
          ))}
          {filteredCompanies.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No companies found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{editingCompany ? 'Edit Company' : 'New Company'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Company Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Logo URL (optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 mt-4 active:scale-[0.98]"
              >
                {editingCompany ? 'Save Changes' : 'Create Company'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
