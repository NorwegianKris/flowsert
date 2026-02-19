ROLLBACK.md

If production breaks:

Go to GitHub → Releases → open latest stable (e.g. v2026w08)

Deploy that exact commit/tag in Lovable

Confirm login + admin dashboard + worker dashboard load

If the break was caused by a DB migration:

Do not “undo” with deletes.

Create a forward-fix migration.
