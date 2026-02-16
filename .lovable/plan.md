

## Add Project Image Upload to New Project Dialog

### What Changes
Add a photo upload field to the "New Project" dialog, positioned between the AI Personnel Suggestions section and the Project Name field -- matching the same upload style already used in the Edit Project dialog.

### How It Works
- A dashed upload area appears below the AI suggestions box
- Click to select an image or drag-and-drop
- Once uploaded, a thumbnail preview is shown with a remove button
- The image is uploaded to the `project-documents` storage bucket using a temporary path (since the project ID doesn't exist yet)
- After the project is created, the image URL is saved to the project's `image_url` field

### User Experience
1. Open "New Project" dialog
2. (Optional) Use AI suggestions as before
3. Click the image upload area or drag a photo
4. See a thumbnail preview with option to remove/change
5. Fill in remaining project details and submit
6. The project is created with the image attached

### Technical Details

**File modified:** `src/components/AddProjectDialog.tsx`

1. **Add state and ref** for image upload (`imageUrl`, `uploading`, `fileInputRef`) -- same pattern as `EditProjectDialog`
2. **Add image upload handler** that uploads to `project-documents` storage bucket using a temporary UUID path, then stores the signed URL
3. **Add image upload UI** between the AI Suggestions section (line ~372) and the Project Name field (line ~376), using the same visual style as `EditProjectDialog` (dashed border box with `ImagePlus` icon, thumbnail preview with remove button)
4. **Include `imageUrl`** in the `newProject` object passed to `onProjectAdded`
5. **Reset `imageUrl`** in the `resetForm` function

**Imports to add:** `ImagePlus`, `X` from lucide-react, `useRef` from React, `supabase` client

No database or schema changes needed -- the `image_url` column and storage bucket already exist.

