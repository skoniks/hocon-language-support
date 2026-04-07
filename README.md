# HOCON Support

VS Code extension for HOCON files.

## Current Features

- Recognizes `.conf` and `.hocon` files as HOCON.
- Provides basic/improved syntax highlighting via TextMate grammar.
- Supports `Format Document` with a built-in MVP formatter.

## Syntax Highlighting

The current grammar covers core constructs:

- comments: `#`, `//`
- strings
- numbers
- booleans
- `null`
- substitutions: `${...}`, `${?...}`
- operators: `:`, `=`, `+=`
- `include`
- unquoted/quoted keys

## Formatter (MVP)

The formatter is intentionally practical and minimal:

- normalizes indentation for nested `{}` and `[]`
- correctly decreases indentation on lines with `}` and `]`
- normalizes spaces around `:`, `=`, `+=`
- preserves comments
- does not modify quoted string contents

## Formatter Limitations

- This is not an AST/parser-based formatter; it uses line-based heuristics.
- For complex, unusual, or partially invalid HOCON, formatting can be imperfect.
- Multiline triple-quoted blocks are intentionally not reformatted internally.

## Development Mode

1. Install dependencies: `npm install`
2. Start watch build: `npm run watch`
3. Press `F5` in VS Code
4. In Extension Development Host, open any `.conf`/`.hocon` file
5. Run `Format Document` to verify formatter behavior

## Useful Commands

- `npm run compile`
- `npm run watch`
- `npm run lint`
- `npm run format`
