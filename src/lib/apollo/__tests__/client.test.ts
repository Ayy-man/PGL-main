import { describe, it, expect } from 'vitest';
import type { PersonaFilters } from '@/lib/personas/types';

// Import functions under test (will implement these next)
import {
  translateFiltersToApolloParams,
  calculatePagination,
} from '../client';

describe('translateFiltersToApolloParams', () => {
  it('maps all PersonaFilters fields to Apollo API parameters', () => {
    const filters: PersonaFilters = {
      titles: ['CEO', 'CFO'],
      seniorities: ['c_suite'],
      industries: ['Finance'],
      locations: ['New York'],
      companySize: ['51-200'],
      keywords: 'private equity',
    };

    const result = translateFiltersToApolloParams(filters);

    expect(result).toEqual({
      person_titles: ['CEO', 'CFO'],
      person_seniorities: ['c_suite'],
      organization_industries: ['Finance'],
      person_locations: ['New York'],
      organization_num_employees_ranges: ['51-200'],
      q_keywords: 'private equity',
    });
  });

  it('excludes undefined fields from output', () => {
    const filters: PersonaFilters = {
      titles: ['CEO'],
      // other fields undefined
    };

    const result = translateFiltersToApolloParams(filters);

    expect(result).toEqual({
      person_titles: ['CEO'],
    });
    expect(result).not.toHaveProperty('person_seniorities');
    expect(result).not.toHaveProperty('organization_industries');
  });

  it('excludes empty arrays from output', () => {
    const filters: PersonaFilters = {
      titles: [],
      seniorities: ['c_suite'],
      industries: [],
    };

    const result = translateFiltersToApolloParams(filters);

    expect(result).toEqual({
      person_seniorities: ['c_suite'],
    });
    expect(result).not.toHaveProperty('person_titles');
    expect(result).not.toHaveProperty('organization_industries');
  });

  it('excludes empty string keywords', () => {
    const filters: PersonaFilters = {
      titles: ['CEO'],
      keywords: '',
    };

    const result = translateFiltersToApolloParams(filters);

    expect(result).toEqual({
      person_titles: ['CEO'],
    });
    expect(result).not.toHaveProperty('q_keywords');
  });

  it('handles completely empty filters', () => {
    const filters: PersonaFilters = {};

    const result = translateFiltersToApolloParams(filters);

    expect(result).toEqual({});
  });
});

describe('calculatePagination', () => {
  it('calculates pagination metadata for first page', () => {
    const result = calculatePagination(150, 1, 50);

    expect(result).toEqual({
      page: 1,
      pageSize: 50,
      totalPages: 3,
      totalResults: 150,
      hasMore: true,
    });
  });

  it('calculates pagination metadata for last page', () => {
    const result = calculatePagination(150, 3, 50);

    expect(result).toEqual({
      page: 3,
      pageSize: 50,
      totalPages: 3,
      totalResults: 150,
      hasMore: false,
    });
  });

  it('caps totalPages at 500 (Apollo limit)', () => {
    const result = calculatePagination(50000, 1, 100);

    expect(result).toEqual({
      page: 1,
      pageSize: 100,
      totalPages: 500,
      totalResults: 50000,
      hasMore: true,
    });
  });

  it('handles zero results', () => {
    const result = calculatePagination(0, 1, 50);

    expect(result).toEqual({
      page: 1,
      pageSize: 50,
      totalPages: 0,
      totalResults: 0,
      hasMore: false,
    });
  });

  it('correctly identifies middle page as having more', () => {
    const result = calculatePagination(200, 2, 50);

    expect(result).toEqual({
      page: 2,
      pageSize: 50,
      totalPages: 4,
      totalResults: 200,
      hasMore: true,
    });
  });

  it('handles exact page boundary', () => {
    const result = calculatePagination(100, 2, 50);

    expect(result).toEqual({
      page: 2,
      pageSize: 50,
      totalPages: 2,
      totalResults: 100,
      hasMore: false,
    });
  });
});
