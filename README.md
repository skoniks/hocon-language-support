# HOCON Language Support

Language support for HOCON files in VS Code.

## Features

- Language identification for `.conf` and `.hocon` files
- TextMate syntax highlighting for core HOCON constructs:
  - comments (`#` and `//`)
  - strings
  - numbers
  - booleans and `null`
  - substitutions (`${...}` and `${?...}`)
  - assignment operators (`:`, `=`, `+=`)
  - keys and `include`
- Document formatter for HOCON via VS Code API (`Format Document`)

## Formatter Behavior

Current formatter is intentionally minimal:

- normalizes indentation based on braces/brackets
- normalizes spaces around `:`, `=`, and `+=`
- preserves comment-only lines
- does not modify string contents

## Project Scope

This extension currently provides:

- language registration
- basic highlighting grammar
- basic document formatting

It intentionally does not include a language server at this stage.

## Development

- Run watch mode: `npm run watch`
- Build once: `npm run compile`
- Lint sources: `npm run lint`
- Format repository: `npm run format`

Then press `F5` in VS Code to start the Extension Development Host.
