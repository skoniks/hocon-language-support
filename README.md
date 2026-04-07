# HOCON Support

VS Code extension for HOCON files.

## Current Features

- Recognizes `.conf` and `.hocon` files as HOCON.
- Provides basic/improved syntax highlighting via TextMate grammar.
- Supports `Format Document` with a built-in formatter.
- Supports code folding for HOCON objects and arrays.

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

## Formatter

The formatter is intentionally practical and minimal:

- normalizes indentation for nested `{}` and `[]`
- correctly decreases indentation on lines with `}` and `]`
- normalizes spaces around `:`, `=`, `+=` and after commas
- normalizes spacing in common inline object/array patterns
- preserves comments
- does not modify quoted string contents
- keeps substitutions (`${...}`, `${?...}`) intact
- respects VS Code formatting settings (`insertSpaces`, `tabSize`)

## Folding

- Supports folding ranges for blocks based on `{}` and `[]`.
- Works with standard folding actions and Fold Level commands.

## Formatter Limitations

- This is not an AST/parser-based formatter; it uses line-based heuristics.
- For complex, unusual, or partially invalid HOCON, formatting can be imperfect.
- Multiline triple-quoted blocks are intentionally not reformatted internally.
- Formatter does not aim to fully reflow multi-line value layout.

## Folding Limitations

- Folding is bracket-based and does not provide custom region markers.
- Invalid/mismatched bracket structures can affect folding quality.

## Development Mode

1. Install dependencies: `npm install`
2. Start watch build: `npm run watch`
3. Press `F5` in VS Code
4. In Extension Development Host, open any `.conf`/`.hocon` file
5. Run `Format Document` to verify formatter behavior

## Useful Commands

- `npm run compile`
- `npm run watch`
- `npm run format`
- `npm run lint`

## TODO

### Editor experience

- Add HOCON snippets for common object, array, include, and substitution patterns.
- Add range formatting support for selected blocks.
- Improve formatter edge-case handling for inline arrays, comments, and mixed spacing.

### Language features

- Add hover help for core HOCON syntax constructs and operators.
- Add completion for common HOCON keywords and patterns.
- Improve handling of comments, includes, arrays, plus-equals assignments, and substitutions in formatting logic.

### Navigation

- Add document symbols support for keys and nested sections in the Outline view.
- Add clickable include paths for local files.
- Add go to definition for substitutions when the target key exists in the workspace or current file.

### Validation

- Add diagnostics for common syntax problems such as unbalanced brackets and broken substitutions.
- Add basic structural validation for malformed key-value lines and invalid include usage.

### HOCON-specific improvements

- Improve support for include variants such as required(file(...)).
- Improve behavior for HOCON merge semantics and plus-equals updates in formatter and language features.
