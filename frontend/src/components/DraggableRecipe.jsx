import { useDraggable } from '@dnd-kit/core';

const DraggableRecipe = ({ recipe }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { recipe },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 100 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary-400 transition-colors group ${
        isDragging ? 'opacity-50' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <span className="text-[11px] font-bold text-slate-700 truncate flex-1 leading-tight">{recipe.name}</span>
        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex-shrink-0 ${
          recipe.category_type === 'Breakfast' ? 'bg-amber-100 text-amber-600' :
          recipe.category_type === 'Lunch' ? 'bg-blue-100 text-blue-600' :
          recipe.category_type === 'Evening Snacks' ? 'bg-orange-100 text-orange-600' :
          'bg-purple-100 text-purple-600'
        }`}>
          {recipe.category_type === 'Evening Snacks' ? 'S' : recipe.category_type[0]}
        </span>
      </div>
    </div>
  );
};

export default DraggableRecipe;
