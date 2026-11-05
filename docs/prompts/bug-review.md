Review the current diff for bugs a judge would hit.

Look for:

- A screen that crashes on an empty list, a denied permission, or a missing API
- A secret read from `EXPO_PUBLIC_` or hardcoded in `mobile/`
- A form that submits without Zod
- A color or spacing value that ignores `useTheme()`
- An API route that calls a model without `principalFromHeader`

Report file paths and the failure. Do not rewrite the app. Fix only the issues you can prove.
