

## Plan: Add console.warn to issuer auto-create error path

**Single file change**: `src/components/SmartCertificateUpload.tsx`

In the try/catch block for issuer auto-creation, replace the simple `if (!error)` check with an else branch that logs the error via `console.warn` before setting `matchedIssuerId = null`.

```typescript
if (!error) {
  matchedIssuerId = newIssuer?.id || null;
} else {
  console.warn('Auto-create issuer failed:', error.message);
  matchedIssuerId = null;
}
```

No other changes.

