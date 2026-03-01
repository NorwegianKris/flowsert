

## Fix Scrollable Lists in AI Suggest Dialog

**Problem**: The `ScrollArea` components wrapping the suggestions and no-match lists don't scroll properly with large result sets.

**Root cause**: Radix `ScrollArea` can behave inconsistently with `max-h-*` classes. Replacing with a plain `div` using `max-h-[400px] overflow-y-auto` is more reliable.

### Changes — single file: `src/components/AISuggestDialog.tsx`

1. **Line 611**: Replace `<ScrollArea className="max-h-[300px]">` with `<div className="max-h-[400px] overflow-y-auto">` (and closing tag on line 676)
2. **Line 692**: Replace `<ScrollArea className="max-h-[200px]">` with `<div className="max-h-[400px] overflow-y-auto">` (and closing tag on line 704)
3. Remove the `ScrollArea` import (line 4) if no longer used elsewhere in the file.

No other changes.

