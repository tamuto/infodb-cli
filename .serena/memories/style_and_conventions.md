## Style & Conventions
- TypeScript across packages, targeting Node 16+; compiled output lives in `dist/` and binaries in `bin/`.
- ESLint config extends `eslint:recommended` + `@typescript-eslint/recommended`; key rules enforce `prefer-const`, `no-var`, forbid unused vars unless prefixed with `_`, while allowing implicit returns/boundaries and warning on `any`.
- Prettier enforces 2 spaces, semicolons, single quotes, trailing commas `es5`, 100-char line width.
- Common patterns: Commander-based CLIs, YAML parsing, modular services under `src/commands` etc.; keep handler exports explicit and avoid hidden globals.
- Keep code comments minimal and purposeful; rely on types and descriptive names rather than verbose inline prose.