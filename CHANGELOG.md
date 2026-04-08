# Change Log

All notable changes to this extension are documented in this file.

## [Unreleased]

- No changes yet.

## [0.0.2]

- Added folding support for HOCON objects and arrays (`{}` and `[]`), including Fold Level workflows.
- Added `HOCON: Normalize Document` command for strict normalization plus formatting in one action.
- Improved formatter spacing behavior for inline objects/arrays and comma handling.
- Formatter now respects VS Code indentation settings (`insertSpaces`, `tabSize`).

## [0.0.1]

- Registered `hocon` language and file associations for `.conf` and `.hocon`
- Added language configuration (`language-configuration.json`)
- Added TextMate grammar for core HOCON constructs
- Added MVP document formatter via VS Code API
- Added sample files for manual validation
