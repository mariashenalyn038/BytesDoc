# BytesDoc — Defense-Week Roadmap

**Snapshot date:** 2026-05-17
**Branch:** `feature/docx-preview-and-modal-polish`
**Audience:** documentation team — sections below can be lifted directly into the weekly update and into the defense slides.

---

## 1. Executive summary

BytesDoc is a Next.js + Supabase document management system with four roles (chief minister, secretary, finance minister, member). All twelve Functional Requirements from Table 2.2.1 are implemented; one (FR8 "lock as read-only PDFs") is met in spirit but not literally — see section 5. Three sprints this week closed the largest gaps surfaced during the project review: admins can now edit active documents reliably, and they can manage administrations, categories, and events from inside the app instead of querying Supabase by hand.

---

## 2. Role and permission matrix

| Action | chief_minister | secretary | finance_minister | member |
|---|---|---|---|---|
| View / Download | ✓ | ✓ (own categories) | ✓ (Budgets, Financial Records, Reports) | ✓ |
| Upload | ✓ (any category) | ✓ (Proposals / Permits / Reports) | ✓ (Budgets / Financial Records / Reports) | ✗ |
| Edit | ✓ (any document) | ✓ (own uploads) | ✓ (own uploads) | ✗ |
| Delete | ✓ (any document) | ✓ (own uploads) | ✓ (own uploads) | ✗ |
| Archive / Bulk archive | ✓ | ✗ | ✗ | ✗ |
| Manage administrations / categories / events | ✓ | ✗ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ |
| View activity logs | ✓ | ✗ | ✗ | ✗ |

Enforcement is layered: every restriction is checked in the frontend (UI hides the control), in the backend Express middleware (`requireAuth` + `requireRole`), and in Supabase Row-Level Security policies on the relevant tables.

---

## 3. Database status vs. the proposed diagram

| Entity | Table | Documents linkage | Admin UI | API |
|---|---|---|---|---|
| `administrations` | ✓ (`0001_administrations.sql`) | UUID FK `documents.administration_id` | ✓ | `/api/administrations` |
| `categories` | ✓ (`0002_categories.sql`) | text column `documents.category`, validated against the table on write | ✓ | `/api/categories` |
| `events` | ✓ (`0003_events.sql`) | text column `documents.event`, validated against the table on write | ✓ | `/api/events` |

Scope note: the agreed diagram showed `categories` and `events` as FK targets like `administrations`. We took the lower-risk path of adding the lookup tables + admin CRUD without rewriting every document row's schema. The admin gets the same self-service experience; promoting `documents.category` and `documents.event` to UUID FKs can be a follow-up.

---

## 4. Changes shipped this week

| Commit | What changed |
|---|---|
| `192f0e9d` | Removed the Lock UI from active documents in the admin dashboard. Archive still auto-locks archived documents (`is_archived = true, is_locked = true`), so the proposal's read-only-on-archive intent is preserved. Side effect: fixes the reported "admin can't edit, only view/download/lock/archive" complaint — locking previously hid the Edit button. |
| `2db0967f` | Added the `categories` table, seeded with the five existing names, with RLS (`read = authenticated, write = chief_minister`). New admin tab to add/rename/delete categories; rename cascades into every document that referenced the old name; delete is blocked if any document still uses it. Upload and Edit modals everywhere now read from the live table. |
| `2e41b95a` | Same treatment for `events`. Also collapsed the three taxonomy tabs (Administrations / Categories / Events) into a single **Document Settings** tab with internal sub-tabs, on user feedback. Fixed a pre-existing bug where the admin Edit modal used a free-text input for `event` (typo-prone) — it's now a dropdown sourced from the events table. |

---

## 5. Functional Requirements (Table 2.2.1)

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Users can log in securely | ✓ | Supabase Auth with JWT + refresh tokens |
| 2 | Users can upload documents | ✓ | `POST /api/documents`, multer + Supabase Storage |
| 3 | Users can download documents | ✓ | Signed URL endpoint, 60 s TTL |
| 4 | Users can search by keywords / categories | ✓ | Title search via `?q=` ILIKE; category filter pills sourced from the live `categories` table |
| 5 | Users can categorize by type / event / administration | ✓ | All three taxonomies are managed entities; admin CRUD in **Document Settings** |
| 6 | Users can view documents without downloading | ✓ | DocumentViewerModal supports both PDF and DOCX preview |
| 7 | Users can archive documents from previous administrations | ✓ | Single + bulk-by-administration archive (admin only); archive auto-marks `is_locked` |
| 8 | Users can lock archived documents as read-only PDFs | ⚠ **PARTIAL** | `is_locked` is a DB flag enforced by the UI and the PUT endpoint — no document is editable while locked. **The file itself is not converted to a flattened PDF** (no `pdf-lib` in the backend). Functional intent met; literal spec is not. |
| 9 | Users can manage document access by role | ✓ | Four roles, frontend route guards + backend `requireRole` + Supabase RLS |
| 10 | Users can track document activity | ✓ | `activity_logs` table; Admin → **Activity Logs** tab with filter + CSV export |
| 11 | Users can navigate easily between pages | ✓ | Tabbed dashboards per role |
| 12 | Users can organize files systematically | ✓ | Category × Event × Administration taxonomy with managed lookup tables prevents duplicate/free-text drift |

---

## 6. Non-Functional Requirements (Table 2.2.2)

| # | Requirement | Status |
|---|---|---|
| 1 | User-friendly and intuitive | ✓ |
| 2 | Secure authentication + role-based access | ✓ |
| 3 | Fast response times (normal ≤ 3 s, peak ≤ 5 s) | ⚠ pending load test |
| 4 | ≥ 50 concurrent users | ⚠ pending load test |
| 5 | Uptime ≥ 99 % during operational hours | ⚠ depends on Supabase plan + hosting tier |
| 6 | Scalable | ✓ Supabase + Next.js scale horizontally |
| 7 | Data integrity / automatic backups | ⚠ depends on Supabase backup configuration |
| 8 | Cross-platform / cross-browser | ✓ responsive Tailwind, Next.js |
| 9 | Maintainable and easy to update | ✓ TypeScript end-to-end, modular routes and stores |
| 10 | Reliable storage and retrieval | ✓ Supabase Storage `documents` bucket |

Items 3, 4, 5 and 7 cannot be verified from the code alone — they need a short ops checklist (load test results, hosting SLA, backup schedule confirmation) before defense.

---

## 7. Outstanding improvements

Captured during the audit; not blockers for defense, candidates for the next sprint:

- **Real PDF conversion on archive (FR8).** Add `pdf-lib` to the backend, flatten DOCX/PDF to a read-only PDF when a document is archived. Today the UI prevents editing, but a determined user with direct DB access could still mutate the file.
- **Confirmation step + unarchive action.** Archive auto-locks and there is currently no undo path from the UI.
- **Soft-delete for documents.** Delete is permanent; a `deleted_at` column + admin recycle bin would prevent accidents.
- **Audit columns on `documents`.** Store `archived_by`, `archived_at` (and possibly `locked_by`, `locked_at`) for traceability.
- **Extend `ActivityLog.action`** to cover create / update / delete on categories and events now that they have admin CRUD.
- **Promote `documents.category` and `documents.event` to UUID FKs** so the schema reflects the diagram exactly. Pragmatically deferred this sprint to keep the migration small.

---

## 8. Known risks and decisions for defense Q&A

- **"Why isn't lock a real PDF conversion?"** Scope decision. The `is_locked` flag plus UI enforcement meets the functional intent (archived documents cannot be modified through the app). Literal conversion to a flattened PDF is recognised as outstanding work (section 7, FR8 in section 5).
- **"Why is `documents.category` still TEXT instead of a FK?"** Lower-risk path. The lookup table exists, the admin manages it from the UI, and the backend rejects unknown names on write — same observable behaviour as a FK with much less migration risk. FK promotion is on the follow-up list.
- **"Why did the three taxonomy tabs become one?"** UX feedback during defense prep — three top-level tabs for closely related managed lists felt cluttered. The sub-tabbed Document Settings page keeps the same functionality while shortening the main nav.
- **"What happens if an admin renames a category that's already in use?"** The PATCH endpoint updates the documents that referenced the old name in the same transaction and rolls back the rename if the document update fails. Same pattern for events.
- **"What if the database doesn't have a category / event yet when someone tries to upload?"** Upload and Edit modals show an explicit disabled `<option>` ("No categories available" / "No events yet — add one in Document Settings"). Submit is blocked with a toast until both are selected.
- **Load and backup numbers (NFRs 3, 4, 5, 7)** are unsubstantiated in the codebase. We need a single ops checklist artifact (load test result + Supabase plan screenshot) to address these in defense.
