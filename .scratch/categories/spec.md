# Categories: manage your own list

Status: done (2026-08-29) — categories table + CategorySection (add/rename/remove, transactional propagation) + categoryList union behind every chip row

Categories today are free labels born only inside a Session's edit sheet; every
chip list (Home quick row, session sheet, Logs filter) is pure usage history,
case-sensitive, with no add/rename/delete. The user wants to own the list:
their categories, pinned up front, editable across history.

Issues: 01 pin-custom, 02 rename-everywhere (blocked by 01), 03 remove-retire
(blocked by 01). Domain note for the design phase: CONTEXT.md currently defines
Category as "drawn from the user's own history" — a managed list revisits that.

## Built shape
- db `categories` table (name UNIQUE); rename/remove update every Session in one transaction
- store: categories state + addCategory/renameCategory/removeCategory (case-insensitive uniqueness)
- engine `categoryList(managed, sessions, limit?)`: managed first, then history MRU, case-insensitive dedupe
- Settings Categories card; sheet suggestions, Home quick row, and Logs filter all consume the union
- clear-all-data removes categories (user content, like blocks); copy updated both languages
- First-launch setup offers optional starter categories (the empty-chips pain for brand-new users, from issue 01's repro)
