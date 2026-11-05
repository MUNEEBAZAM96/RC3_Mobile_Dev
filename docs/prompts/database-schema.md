Design the schema for the MVP.

Follow `ItemRepository`: one module with `list`, `get`, `create`, `update`, and `remove`. Use SQLite on the device unless a row must be shared or must stay secret.

For each table include columns, primary key, and who can read it. If a table belongs on the API, say whether it needs `DATABASE_URL` or can stay in memory for the demo.

Do not generate migration tooling. Write the `CREATE TABLE` statements and the repository method names.
