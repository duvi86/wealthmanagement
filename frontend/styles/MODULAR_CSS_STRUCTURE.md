# Modular CSS Structure (React)

This frontend now follows the same modular CSS organization used in Dash.

## Folder Structure

```
styles/
├── styles.css                      # Master entry point - imports everything in order
├── design-system/
│   ├── colors-shared.css
│   ├── colors-light.css
│   ├── typography.css
│   └── spacing.css
└── styles/
    ├── 00_layout.css
    ├── 01_cards.css
    ├── 02_charts.css
    ├── 03_tables.css
    ├── 04_sidebar.css
    ├── 05_forms.css
    ├── 06_navigation.css
    ├── 07_analytics.css
    ├── 08_modals.css
    ├── 09_pickers.css
    ├── 10_status-badges.css
    ├── 11_buttons-actions.css
    └── 12_utilities.css
```

## Import Order

`app/globals.css` imports only `styles/styles.css`.

`styles/styles.css` imports:
1. Design tokens (`design-system/*`)
2. Numbered component modules (`styles/00...12`)

## Migration Notes

- New CSS should be added to the numbered module files only.
- Keep selectors scoped to their category file (`00` to `11`).
- Reserve `12_utilities.css` for shared utility classes only.
