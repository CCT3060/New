/**
 * RecipeStatusBadge component tests
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecipeStatusBadge from '../modules/recipe/components/RecipeStatusBadge';

describe('RecipeStatusBadge', () => {
  const statuses = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

  statuses.forEach((status) => {
    it(`renders correctly for status: ${status}`, () => {
      render(<RecipeStatusBadge status={status} />);
      const badge = screen.getByText(status.replace('_', ' '));
      expect(badge).toBeInTheDocument();
    });
  });

  it('renders unknown status gracefully', () => {
    render(<RecipeStatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN STATUS')).toBeInTheDocument();
  });
});
