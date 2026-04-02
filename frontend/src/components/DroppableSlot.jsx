import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

const DroppableSlot = ({ id, category, recipes, date, onDelete }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { category, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[100px] p-2 rounded-xl transition-all duration-300 border-2 border-dashed flex flex-col gap-1.5 ${
        isOver 
        ? 'bg-primary-50/50 border-primary-500 scale-[1.02] shadow-[0_0_15px_rgba(37,99,235,0.1)] z-10' 
        : 'bg-slate-50/30 border-slate-100 hover:border-slate-200'
      }`}
    >
      {recipes && recipes.length > 0 ? (
        recipes.map(recipe => (
          <div key={recipe.id} className="bg-white p-1.5 px-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group animate-in slide-in-from-left-1 duration-150">
             <span className="text-[10px] font-bold text-slate-700 truncate leading-none">{recipe.recipe_name || recipe.name}</span>
             <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(recipe.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-all"
             >
                <Trash2 className="w-3 h-3" />
             </button>
          </div>
        ))
      ) : (
        <div className="flex-1 flex items-center justify-center pointer-events-none">
            <span className="text-[8px] font-black text-slate-200 uppercase tracking-[0.15em]">Empty</span>
        </div>
      )}
    </div>
  );
};

export default DroppableSlot;
