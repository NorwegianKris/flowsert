
# Internal Posted Projects -- Phase 1

## Status: IMPLEMENTED

All database migrations and code changes have been completed.

## What was done:

### Database
- Added `country` and `city` columns to `personnel` (backfilled normalized)
- Added `visibility_all`, `visibility_countries`, `visibility_cities` to `projects`
- Added `projects_visibility_check` CHECK constraint (NOT VALID + VALIDATE)
- Created `project_applications` table with RLS + updated_at trigger
- Created `can_worker_see_posted_project` security definer function

### Code Changes
- Updated `Personnel` type with `country`/`city` fields
- Updated `Project` type with `visibilityAll`/`visibilityCountries`/`visibilityCities`
- Updated `useProjects` CRUD to include visibility fields
- Updated `usePersonnel` to map country/city
- Updated `useGeoSearch` to return `structuredResults` (city/country separate)
- Updated `GeoLocationInput` with `onStructuredSelect` callback
- Updated `EditPersonnelDialog` to save normalized country/city
- Created `ProjectVisibilityControls` component (admin visibility selector)
- Created `PostedProjects` component (worker-facing posted projects + apply)
- Created `ProjectApplicationsList` component (admin applications tab)
- Created `usePostedProjects` hook
- Created `useProjectApplications` hook
- Integrated visibility controls into `AddProjectDialog` and `EditProjectDialog`
- Added Applications tab to `ProjectDetail` (for posted projects)
- Updated `WorkerDashboard` with split layout (invitations + posted projects)
