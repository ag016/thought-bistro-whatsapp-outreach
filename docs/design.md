# Design Document: Thought Bistro Lead Machine

## 1. Overview
A mobile-responsive web application to manage Meta Ad leads from Google Sheets and execute a 10-step WhatsApp nurture sequence. The app prioritizes "ease of operation" for the user, providing pre-filled WhatsApp links for manual sending, with a backend architecture ready for full API automation.

## 2. Core Features
- **Google Sheets Sync**: Periodically pulls new leads from the Meta Ads sheet.
- **Nurture Tracking**: Tracks each lead's progress through the 10-message sequence.
- **One-Click Sending**: Generates `wa.me` links with pre-filled, formatted messages.
- **Automation Queue**: Highlights leads "Due Today" based on the spacing logic (Day 1, 2, 4, etc.).
- **Lead Management**: Ability to pause a lead (Stop queue) when they reply.
- **Simple Auth**: Password-protected entry.

## 3. Technical Architecture
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (Modern, clean, professional)
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Server Components + Client-side hooks for real-time updates.

## 4. Database Schema (Supabase)

### Table: `leads`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier |
| `sheet_id` | Text | ID from Google Sheet to prevent duplicates |
| `full_name` | Text | Lead's name |
| `phone_number` | Text | Cleaned phone number (with country code) |
| `company_name` | Text | Clinic name |
| `current_step` | Integer | Current message index (0-9) |
| `status` | Text | `active`, `paused`, `converted`, `completed` |
| `last_sent_at` | Timestamp | Date/Time of last message sent |
| `created_at` | Timestamp | Date lead entered the system |
| `metadata` | JSONB | Other sheet data (clinic type, price, etc.) |

### Table: `nurture_sequence`
| Column | Type | Description |
| :--- | :--- | :--- |
| `step_number` | Integer (PK) | 1 to 10 |
| `day_offset` | Integer | Days from start (1, 2, 4, 6, 9, 12, 16, 20, 25, 30) |
| `message_text` | Text | The actual message content |

## 5. UI/UX Design
- **Dashboard (Main)**: 
    - Top Section: Stats (Total Leads, Due Today, Converted).
    - Main List: "Due Today" cards. Each card has:
        - Lead Name & Clinic.
        - "Send Message [X]" button $\rightarrow$ opens WhatsApp.
        - "Pause Lead" toggle.
- **Lead Detail Page**:
    - Full info from the sheet.
    - Timeline of sent messages.
    - Manual "Force Send Next Message" button.
- **Settings**:
    - Google Sheet API Key / Spreadsheet ID.
    - Sequence Editor (to tweak messages).

## 6. Logic Flow
1. **Sync**: `Sync Engine` $\rightarrow$ Google Sheets $\rightarrow$ Supabase `leads` (upsert).
2. **Due Calculation**: 
   `isDue = (today - created_at) >= sequence[current_step].day_offset` 
   AND `(today - last_sent_at) >= 1 day`.
3. **Send**: User clicks `wa.me` $\rightarrow$ Opens WhatsApp $\rightarrow$ User sends $\rightarrow$ App marks `current_step++` and `last_sent_at = now`.
4. **Stop**: User toggles `status = 'paused'` $\rightarrow$ Lead disappears from "Due Today" list.
