

## Plan: Wrap Issuer Auto-Create in Try/Catch

**Single file change**: `src/components/SmartCertificateUpload.tsx`, lines 167–177.

Replace the current auto-create block:

```typescript
        } else {
          // genuinely new — auto-create
          const { data: newIssuer } = await supabase
            .from('issuer_types')
            .insert({
              name: data.extractedData.issuingAuthority,
              business_id: businessId,
            })
            .select('id')
            .single();
          matchedIssuerId = newIssuer?.id || null;
        }
```

With:

```typescript
        } else {
          // genuinely new — auto-create (silent failure)
          try {
            const { data: newIssuer, error } = await supabase
              .from('issuer_types')
              .insert({
                name: data.extractedData.issuingAuthority,
                business_id: businessId,
              })
              .select('id')
              .single();
            if (!error) matchedIssuerId = newIssuer?.id || null;
          } catch {
            matchedIssuerId = null;
          }
        }
```

No other changes.

