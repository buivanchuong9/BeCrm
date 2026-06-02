# Deep API Contract Analysis Artifacts

Generated from:

- FE routes: `src/app/routes.tsx`
- FE pages/components under `src/pages`
- FE services under `src/services`
- FE URL registry: `src/configs/urls.ts`
- Current BE NestJS controllers under `../be/src`

## Output Map

1. Screen to API Matrix: `screen-api-matrix.csv`, section 1 in `DEEP_API_CONTRACT_ANALYSIS.md`
2. Button to API Matrix: `button-api-matrix.csv`, section 2 in `DEEP_API_CONTRACT_ANALYSIS.md`
3. Form DTO Specification: `form-dto-spec.csv`, section 3 in `DEEP_API_CONTRACT_ANALYSIS.md`
4. Table Response Specification: `table-response-spec.csv`, section 4 in `DEEP_API_CONTRACT_ANALYSIS.md`
5. Missing Backend APIs: `missing-backend-apis.csv`, section 5 in `DEEP_API_CONTRACT_ANALYSIS.md`
6. Backend Coverage Report: `backend-coverage-report.csv`, section 6 in `DEEP_API_CONTRACT_ANALYSIS.md`
7. Swagger Specification: `openapi.generated.yaml`
8. Backend Build Priority: section 8 in `DEEP_API_CONTRACT_ANALYSIS.md`
9. Frontend Blockers: section 9 in `DEEP_API_CONTRACT_ANALYSIS.md`
10. Recommended Final API Architecture: section 10 in `DEEP_API_CONTRACT_ANALYSIS.md`

## Current Counts

- Screens analyzed: 84
- FE service calls analyzed: 1719
- Unique FE endpoint contracts: 1498
- Current BE routes detected: 214
- FE endpoints currently matched by BE: 167
- Missing FE-required backend endpoints: 1331

## Re-run

```sh
node scripts/deep-api-contract-analysis.js
```

Run from the `crm` directory after FE or BE route changes.
