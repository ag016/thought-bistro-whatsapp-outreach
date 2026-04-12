# Implementation Plan: Thought Bistro Lead Machine

## Phase 1: Project Foundation
- [ ] Initialize Next.js project with Tailwind CSS and TypeScript.
- [ ] Set up Supabase project and run SQL migrations to create `leads` and `nurture_sequence` tables.
- [ ] Seed the `nurture_sequence` table with the 10 provided messages and their day offsets.
- [ ] Implement basic password-protected middleware for authentication.

## Phase 2: Data Integration (The Engine)
- [ ] Create a Google Sheets service to fetch leads from the provided sheet.
- [ ] Implement the `syncLeads` function:
    - Pull rows from Google Sheet.
    - Map sheet columns to Supabase `leads` table.
    - Handle upserts (update existing leads, insert new ones).
- [ ] Create a cron-like trigger or a "Sync Now" button in the UI to update lead data.

## Phase 3: The Nurture Dashboard (The UI)
- [ ] Build the "Due Today" view:
    - Logic to filter leads where `(today - created_at) >= current_step.day_offset` and `status == 'active'`.
    - Lead cards with summary info.
- [ ] Implement the `wa.me` link generator:
    - Format phone numbers to international standard.
    - URL-encode the message text for the current step.
- [ ] Add "Send" and "Pause" actions:
    - "Send" $\rightarrow$ Update `current_step` and `last_sent_at`.
    - "Pause" $\rightarrow$ Update `status` to `paused`.

## Phase 4: Detail & Management Views
- [ ] Build the Lead Detail page:
    - Display all lead information from the sheet.
    - History of sent messages.
    - Manual "Force Next Message" override.
- [ ] Build a simple "Sequence Manager" to view/edit the 10 messages.

## Phase 5: Polish & Mobile Optimization
- [ ] Ensure all buttons are "thumb-friendly" for mobile usage.
- [ ] Add loading states and success toasts (e.g., "Lead updated").
- [ ] Final UX audit: ensure the flow from "Due Today" $\rightarrow$ "WhatsApp" $\rightarrow$ "Updated" is seamless.
