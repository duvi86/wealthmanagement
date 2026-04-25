# Phase 7: QA and Quality Gate

Status: Defined and documented. Implementation may proceed incrementally.

## Scope

Phase 7 extends quality assurance coverage beyond Phase 6 baseline gates.

Targets:
1. Route smoke coverage for all primary frontend routes.
2. Component behavior tests for critical reusable UI primitives.
3. Accessibility validation (focus, keyboard, ARIA consistency).
4. Responsive checks (desktop/tablet/mobile) and interaction states.

## Planned Test Matrix

### Frontend Route Smoke

Minimum routes:
- `/`
- `/okr`
- `/dependencies`
- `/capacity`
- `/config`
- `/charts`
- `/temporal`
- `/components`
- `/forms`
- `/tables`
- `/advanced`
- `/exploratory`
- `/notifications`
- `/chatbot`

Assertions:
- Route renders without runtime error.
- Core heading/page-shell is present.
- No fatal hydration mismatch.

### Component Behavior

Priority components:
- Buttons: variant classes, disabled/loading semantics.
- Tabs: keyboard and active panel switching behavior.
- Modal: open/close, focus handling, ESC behavior.
- DataTable: sort/search/pagination behavior.
- Form controls: label binding and error state rendering.

### Accessibility

Checks:
- Keyboard navigation order and visible focus states.
- ARIA attributes for tabs/modal/toasts and interactive controls.
- Contrast sanity for semantic status colors.
- No obvious role/label anti-patterns.

### Responsive

Viewport targets:
- Mobile: 375x812
- Tablet: 768x1024
- Desktop: 1440x900

Checks:
- Top navigation collapse behavior.
- Table overflow handling.
- Chart/card layout wrapping and no clipped controls.

## Exit Criteria

1. New QA tests run in CI.
2. No critical accessibility regressions in smoke scope.
3. Responsive regressions are triaged and fixed for priority routes.
4. Frontend lint/build and backend smoke remain green.

## Notes

- Phase 7 builds on Phase 6 and should not weaken current gates.
- Tests should stay deterministic and avoid brittle visual-only assertions.
