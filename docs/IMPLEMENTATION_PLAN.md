# Implementation Plan: CRM Enhancements

## 1. Fix Authentication-based Bugs
- **Main Page (`project/src/app/page.tsx`)**: Update `loadLeads` trigger to fire when either `authed` (PIN) or `session` (Google) is present.
- **Lead Detail Page (`project/src/app/leads/[id]/page.tsx`)**: Update the auth redirect check to allow access if `session` is present, not just the PIN `AUTH_KEY`.

## 2. Implement Analytics Page
- Create `project/src/app/analytics/page.tsx`.
- Implement data fetching for lead stats over different timelines (Day, Week, Month).
- Since data is in Google Sheets/Local DB, I'll need to calculate these stats based on `created_at` and `last_sent_at`.
- UI: Visual cards and potentially a simple trend list/chart.

## 3. Implement Settings Page
- Create `project/src/app/settings/page.tsx`.
- Add "Account" section with Google Auth status and a "Disconnect/Sign Out" button.
- Add "General Settings" (e.g., custom company name, default currency - though these might be hardcoded for now, I'll provide placeholders).
- Update the bottom navigation in `project/src/app/page.tsx` to actually link to these pages.

## 4. Custom Messages Library (Lead Detail Page)
- Add a "Quick Templates" section to `project/src/app/leads/[id]/page.tsx`.
- Include the two provided message templates.
- Allow users to click a template to copy it to clipboard or open it in WhatsApp (with lead name replacement).

## 5. Final Polish & Git Commit
- Ensure consistent styling (Dark theme, `#25D366` accents).
- Run a final check for "well-made CRM" feel.
- Commit changes using the provided Git token.

## Technical Details:
- **Routing**: Next.js App Router.
- **Auth**: NextAuth.js.
- **Styling**: Inline styles (as per current project pattern).
