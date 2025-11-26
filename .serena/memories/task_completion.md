## Task Completion Checklist
- Re-run `pnpm run build` (and `pnpm run dev` if watch mode is active) in each package you touched to ensure TypeScript compiles to `dist/` without errors.
- Execute `pnpm run test` (and `pnpm run test-local` for CLI behaviour) before handing work back; update/extend sample configs if new features need coverage.
- When modifying CLI interfaces or behaviour, verify `bin/` entrypoints resolve correctly by running `pnpm run start -- --help` or targeted commands.
- Confirm README/docs under each package reflect new commands/flags; keep version numbers untouched unless coordinating a release.