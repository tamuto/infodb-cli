# licscan

License and Copyright Scanner for package.json and pyproject.toml

## Overview

`licscan` is a command-line tool that scans your project dependencies and extracts license and copyright information from:
- **npm packages** (via `package.json`)
- **Python packages** (via `pyproject.toml`)

This tool helps you maintain compliance by providing a clear view of all licenses and copyrights in your dependencies.

## Features

- Scan npm dependencies from `package.json`
- Scan Python dependencies from `pyproject.toml`
- **Automatic Python environment detection** (uv, Poetry, venv, system)
- Extract license information from package metadata
- Extract copyright information from LICENSE files
- Support for multiple output formats: text, JSON, CSV
- Include or exclude dev dependencies
- Export results to file

## Installation

```bash
npm install -g @infodb/licscan
# or use with npx
npx @infodb/licscan [path]
```

## Usage

### Basic Usage

Scan current directory:
```bash
licscan
# or
licscan scan
```

Scan specific directory:
```bash
licscan /path/to/project
# or
licscan scan /path/to/project
```

### Options

- `-d, --include-dev` - Include dev dependencies (default: false)
- `-f, --format <format>` - Output format: `text`, `json`, or `csv` (default: text)
- `-o, --output <file>` - Write output to file instead of stdout
- `--npm-only` - Scan only npm dependencies (package.json)
- `--python-only` - Scan only Python dependencies (pyproject.toml)

### Examples

Include dev dependencies:
```bash
licscan -d
```

Export to JSON:
```bash
licscan -f json -o licenses.json
```

Export to CSV with dev dependencies:
```bash
licscan -d -f csv -o licenses.csv
```

Scan only npm dependencies:
```bash
licscan --npm-only
```

Scan only Python dependencies:
```bash
licscan --python-only
```

Scan Python project:
```bash
licscan /path/to/python/project -f json
```

Scan npm dependencies from a monorepo project (that has both package.json and pyproject.toml):
```bash
licscan /path/to/monorepo --npm-only -f json -o npm-licenses.json
```

## Output Formats

### Text (default)
Human-readable format with package details:
```
================================================================================
NPM PACKAGES (3)
================================================================================

Package: commander@11.1.0
License: MIT
Author:  TJ Holowaychuk
Homepage: https://github.com/tj/commander.js
Repository: git+https://github.com/tj/commander.js.git
Copyright:
  Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
--------------------------------------------------------------------------------
...
```

### JSON
Machine-readable JSON format:
```json
[
  {
    "type": "npm",
    "packages": [
      {
        "name": "commander",
        "version": "11.1.0",
        "license": "MIT",
        "copyright": "Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>",
        "author": "TJ Holowaychuk",
        "repository": "git+https://github.com/tj/commander.js.git",
        "homepage": "https://github.com/tj/commander.js"
      }
    ]
  }
]
```

### CSV
Spreadsheet-compatible format:
```csv
Type,Name,Version,License,Author,Homepage,Repository,Copyright
npm,commander,11.1.0,MIT,TJ Holowaychuk,https://github.com/tj/commander.js,git+https://github.com/tj/commander.js.git,Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
```

## How It Works

### For npm packages (package.json):
1. Reads `package.json` to get dependency list
2. For each dependency, reads `node_modules/<package>/package.json`
3. Extracts license information from package metadata
4. Reads LICENSE file to extract copyright information
5. Compiles all information into structured output

### For Python packages (pyproject.toml):
1. Reads `pyproject.toml` (supports both Poetry and PEP 621 formats)
2. Extracts dependency list
3. **Detects Python environment**:
   - Checks for `uv.lock` (uv projects)
   - Checks for `poetry.lock` (Poetry projects)
   - Checks for `VIRTUAL_ENV` environment variable (venv)
   - Checks for common venv directories (`venv`, `.venv`, `env`, `.env`)
   - Falls back to system Python
4. Uses appropriate command prefix (`uv run pip show`, `poetry run pip show`, or `pip show`)
5. Attempts to locate and read LICENSE files from installed packages
6. Compiles all information into structured output

## Development

### Setup

```bash
cd licscan
npm install
```

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

This will watch for file changes and rebuild automatically.

### Test

```bash
npm run test
```

## Project Structure

```
licscan/
├── package.json
├── tsconfig.json
├── README.md
├── bin/
│   └── cli.js           # CLI entry point
└── src/
    ├── index.ts          # Main CLI setup
    ├── commands/
    │   └── scan.ts       # Scan command implementation
    └── utils/
        ├── logger.ts     # Logging utility
        ├── package-parser.ts      # npm package parser
        └── pyproject-parser.ts    # Python package parser
```

## Limitations

- For Python packages, packages must be installed in the detected environment (venv, Poetry, uv, or system)
- Python environment detection automatically supports:
  - **uv projects**: Detects `uv.lock` and uses `uv run pip show`
  - **Poetry projects**: Detects `poetry.lock` and uses `poetry run pip show`
  - **venv environments**: Detects `VIRTUAL_ENV` or common venv directories
  - **System Python**: Falls back when no virtual environment is detected
- Copyright extraction depends on the presence of LICENSE files and may not work for all packages
- Some packages may not have proper license metadata

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
