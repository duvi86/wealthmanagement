# Phase 8: Starter Kit Hardening

Status: Defined and documented. Implementation may proceed incrementally.

## Scope

Phase 8 focuses on long-term maintainability and template reuse quality.

Targets:
1. Standardize naming conventions and export patterns.
2. Reduce duplication across frontend modules and pages.
3. Enforce token-only styling discipline.
4. Optimize heavy routes for maintainability and load behavior.

## Hardening Areas

### Naming and Export Conventions

- Align file naming and component naming patterns in `frontend/components/ui`.
- Prefer explicit named exports for reusable components.
- Keep route page files thin and composition-oriented.

### Duplication Reduction

- Consolidate repeated page patterns into shared UI wrappers.
- Avoid local copy-paste style blocks when existing class patterns exist.
- Keep API hook behavior centralized in `hooks/use-api.ts`.

### Styling Governance

- Use design tokens from `styles/design-system/`.
- Keep category ownership in `styles/styles/00...11`.
- Reserve `styles/styles/12_utilities.css` for generic utilities only.
- Use typography tokens (`--type-size-*`, `--type-line-*`) for text sizing.

### Performance and Load Quality

Priority routes:
- `/components`
- `/charts`
- `/advanced`
- `/exploratory`

Actions:
- Remove unnecessary re-renders and oversized inline data where possible.
- Keep chart component props stable.
- Review large page composition for simplification opportunities.

## Exit Criteria

1. Clear naming/export conventions documented and applied.
2. Major duplicate patterns refactored into shared components/utilities.
3. Token-only styling policy enforced in active modules.
4. Build remains green with no regression in route behavior.

## Notes

- Hardening is about template quality, not feature growth.
- Prefer small, safe refactors with CI verification per change set.
