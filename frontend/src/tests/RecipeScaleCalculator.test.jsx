/**
 * RecipeScaleCalculator component tests
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecipeScaleCalculator from '../modules/recipe/components/RecipeScaleCalculator';

const mockRecipe = { id: '1', recipeCode: 'REC-001', recipeName: 'Veg Pulao', standardPax: 50 };

const mockScaleResult = {
  targetPax: 100,
  scaleFactor: '2.0000',
  ingredients: [
    { itemName: 'Basmati Rice', itemCode: 'INV-RICE-001', scaledGrossQty: '10.000', grossUnit: 'kg', wastagePercent: '2.00', scaledNetQty: '9.800' },
    { itemName: 'Onion', itemCode: 'INV-ONI-001', scaledGrossQty: '4.000', grossUnit: 'kg', wastagePercent: '10.00', scaledNetQty: '3.600' },
  ],
};

describe('RecipeScaleCalculator', () => {
  it('renders the standard pax as read-only', () => {
    render(<RecipeScaleCalculator recipe={mockRecipe} onScale={vi.fn()} scaleResult={null} scaleLoading={false} />);
    const stdPaxInput = screen.getByDisplayValue('50');
    expect(stdPaxInput).toBeInTheDocument();
    expect(stdPaxInput).toHaveAttribute('readonly');
  });

  it('enables the scale button only when target pax is entered', () => {
    render(<RecipeScaleCalculator recipe={mockRecipe} onScale={vi.fn()} scaleResult={null} scaleLoading={false} />);
    const btn = screen.getByText('⚖ Scale Recipe');
    expect(btn).toBeDisabled();

    const input = screen.getByPlaceholderText('e.g. 150');
    fireEvent.change(input, { target: { value: '100' } });
    expect(btn).not.toBeDisabled();
  });

  it('calls onScale with the target pax when button is clicked', () => {
    const onScale = vi.fn();
    render(<RecipeScaleCalculator recipe={mockRecipe} onScale={onScale} scaleResult={null} scaleLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. 150'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('⚖ Scale Recipe'));
    expect(onScale).toHaveBeenCalledWith({ targetPax: 100 });
  });

  it('renders scaled ingredient table when scaleResult is provided', () => {
    render(<RecipeScaleCalculator recipe={mockRecipe} onScale={vi.fn()} scaleResult={mockScaleResult} scaleLoading={false} />);
    expect(screen.getByText('Veg Pulao')).toBeInTheDocument();
    expect(screen.getByText('Basmati Rice')).toBeInTheDocument();
    expect(screen.getByText('Onion')).toBeInTheDocument();
    expect(screen.getByText('Scale factor:')).toBeInTheDocument();
  });

  it('shows loading state when scaleLoading is true', () => {
    render(<RecipeScaleCalculator recipe={mockRecipe} onScale={vi.fn()} scaleResult={null} scaleLoading={true} />);
    expect(screen.getByText('Calculating...')).toBeInTheDocument();
  });
});
