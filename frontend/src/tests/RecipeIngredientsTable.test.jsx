/**
 * RecipeIngredientsTable component tests — live net qty / line cost calculations
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecipeIngredientsTable from '../modules/recipe/components/RecipeIngredientsTable';

// Mock the hook that fetches inventory items
vi.mock('../modules/recipe/hooks/useRecipes', () => ({
  useInventoryItems: (warehouseId) => ({
    data: warehouseId
      ? [
          { id: 'item-1', itemName: 'Basmati Rice', itemCode: 'INV-RICE-001', unit: 'kg', costPerUnit: 120 },
          { id: 'item-2', itemName: 'Onion', itemCode: 'INV-ONI-001', unit: 'kg', costPerUnit: 30 },
        ]
      : [],
    isLoading: false,
  }),
}));

const mockIngredients = [
  {
    id: 'ing-1',
    inventoryItemId: 'item-1',
    inventoryItem: { itemName: 'Basmati Rice', itemCode: 'INV-RICE-001' },
    grossQty: '5.000',
    grossUnit: 'kg',
    wastagePercent: '2.00',
    netQty: '4.9000',
    unitCostSnapshot: '120.00',
    lineCost: '588.0000',
    notes: null,
  },
];

describe('RecipeIngredientsTable', () => {
  it('renders ingredient rows with calculated values', () => {
    render(
      <RecipeIngredientsTable
        ingredients={mockIngredients}
        warehouseId="wh-1"
        disabled={false}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('Basmati Rice')).toBeInTheDocument();
    expect(screen.getByText('5.000')).toBeInTheDocument();
    // Net qty
    expect(screen.getByText('4.9000')).toBeInTheDocument();
  });

  it('shows ingredient count in header', () => {
    render(
      <RecipeIngredientsTable
        ingredients={mockIngredients}
        warehouseId="wh-1"
        disabled={false}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText(/1 items/)).toBeInTheDocument();
  });

  it('shows empty state when no ingredients', () => {
    render(
      <RecipeIngredientsTable
        ingredients={[]}
        warehouseId="wh-1"
        disabled={false}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText(/No ingredients added yet/)).toBeInTheDocument();
  });

  it('hides add button in disabled mode', () => {
    render(
      <RecipeIngredientsTable
        ingredients={[]}
        warehouseId="wh-1"
        disabled={true}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.queryByText('+ Add Ingredient')).not.toBeInTheDocument();
  });

  it('shows add ingredient row when add button is clicked', () => {
    render(
      <RecipeIngredientsTable
        ingredients={[]}
        warehouseId="wh-1"
        disabled={false}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('+ Add Ingredient'));
    expect(screen.getByText('Select ingredient...')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <RecipeIngredientsTable
        ingredients={mockIngredients}
        warehouseId="wh-1"
        disabled={false}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={onRemove}
      />
    );
    fireEvent.click(screen.getAllByTitle('Remove')[0]);
    expect(onRemove).toHaveBeenCalledWith('ing-1');
  });
});
