# Caravana Delivery Hub: Preservation Rules

## CRITICAL: DO NOT MODIFY WITHOUT PERMISSION
- **Real-Time Core**: Do not alter `src/App.jsx` listeners or `src/lib/supabaseClient.js`. The Postgres real-time sync is fragile and must remain intact.
- **PDF Layout**: `src/components/ReceiptTemplate.jsx` is layout-sensitive. Do not change margins, font scaling, or global CSS affecting PDF generation.
- **Routing**: Maintain Hash-based routing in `src/App.jsx`. Do not switch to BrowserHistory or change `viewMode`/`activeTab` logic.

## ARCHITECTURAL BOUNDARIES
- **Mobile UI**: `src/components/TeamView.jsx` must stay minimalist. New features (like Warehouse/Testing) must be additive or hidden behind toggles.
- **Data Integrity**: Ensure `handleSaveDelivery` in `src/components/DeliveryFormModal.jsx` continues to support all existing fields (Trial toggles, Item notes, etc.).

## WORKFLOW REQUIREMENTS
1. **Audit First**: Before any code change, verify if the task impacts the files listed above.
2. **Plan Step**: You must provide a "Change Plan" listing exactly which lines you intend to edit before touching the code.
3. **Additive Logic**: Favor creating new components/files over expanding existing complex files.
