## Frequently Used Commands
- `cd lctl && pnpm install`  install deps per package (repo keeps isolated lockfiles).
- `cd lctl && pnpm run dev`  watch-mode TypeScript build; good while iterating on CLI features.
- `cd lctl && pnpm run build`  produce `dist/` before publishing or manual testing.
- `cd lctl && pnpm run start -- <args>`  execute the CLI from source (same as `pnpx @infodb/lctl`).
- `cd lctl && pnpm run test`  smoke-test by building then running `dist/index.js`.
- `cd lctl && pnpm run test-local`  run CLI against the bundled `sample/` project for manual validation.