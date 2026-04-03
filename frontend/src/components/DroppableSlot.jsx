import { useDroppable } from '@dnd-kit/core';
import { Trash2, Users, RefreshCw } from 'lucide-react';

const DroppableSlot = ({ id, category, recipes, date, onDelete, onUpdatePax, onReplace }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { category, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[120px] p-2 rounded-2xl transition-all duration-300 border-2 border-dashed flex flex-col gap-2 ${
        isOver 
        ? 'bg-primary-50/50 border-primary-500 scale-[1.02] shadow-[0_0_20px_rgba(37,99,235,0.1)] z-10' 
        : 'bg-slate-50/20 border-slate-100 hover:border-slate-200'
      }`}
    >
      {recipes && recipes.length > 0 ? (
        recipes.map(recipe => (
          <div key={recipe.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 group animate-in slide-in-from-left-1 duration-200 hover:border-primary-300 hover:shadow-md transition-all">
             <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-black text-slate-800 truncate leading-tight flex-1 uppercase tracking-tighter">{recipe.recipe_name || recipe.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button 
                         onClick={(e) => { e.stopPropagation(); onReplace(recipe); }}
                         className="p-1 hover:bg-primary-50 text-slate-300 hover:text-primary-600 rounded transition-all"
                         title="Replace Recipe"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                        className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-all"
                        title="Remove"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
             </div>
             
             {/* Pax Controls */}
             <div className="flex items-center justify-between mt-auto">
                <div 
                    className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 cursor-pointer hover:bg-white hover:border-primary-200 transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        const newPax = prompt("Enter Pax Count for this entry:", recipe.pax_count || 1);
                        if (newPax && !isNaN(newPax)) onUpdatePax(recipe.id, parseInt(newPax));
                    }}
                >
                    <Users className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-[9px] font-black text-primary-600">{recipe.pax_count || 1} <span className="text-slate-400 opacity-50">PAX</span></span>
                </div>
                
                <span className={`text-[8px] font-black uppercase tracking-widest ${
                    recipe.category === 'Lunch' ? 'text-blue-400' :
                    recipe.category === 'Dinner' ? 'text-purple-400' :
                    recipe.category === 'Breakfast' ? 'text-amber-400' : 'text-orange-400'
                }`}>
                    {recipe.category_type || recipe.category}
                </span>
             </div>
          </div>
        ))
      ) : (
        <div className="flex-1 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] -rotate-45">Available</span>
        </div>
      )}
    </div>
  );
};

export default DroppableSlot;
