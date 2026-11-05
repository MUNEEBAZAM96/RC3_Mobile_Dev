Implement one feature slice end to end, and do not start the next slice.

A slice includes:

- The route under `mobile/app`
- UI composed from `mobile/src/components/ui`
- A repository or an API helper, not both unless the phone must cache a server response
- Zod on any form
- A protected route if the slice requires a signed-in person

When you finish, say how to tap through the slice on a simulator. Leave unrelated files alone.
