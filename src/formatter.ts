import * as vscode from 'vscode';

interface LineSplit {
  code: string;
  comment: string;
}

function countTripleQuoteTokens(line: string): number {
  let count = 0;

  for (let i = 0; i < line.length - 2; i++) {
    if (line[i] === '"' && line[i + 1] === '"' && line[i + 2] === '"') {
      count++;
      i += 2;
    }
  }

  return count;
}

function isCommentOnlyLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('#') || trimmed.startsWith('//');
}

function splitCodeAndComment(line: string): LineSplit {
  let inString = false;
  let escaped = false;
  let substitutionDepth = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : '';

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (substitutionDepth > 0) {
      if (ch === '{') {
        substitutionDepth++;
      } else if (ch === '}') {
        substitutionDepth = Math.max(0, substitutionDepth - 1);
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '$' && next === '{') {
      substitutionDepth = 1;
      i++;
      continue;
    }

    if (ch === '#') {
      return {
        code: line.slice(0, i),
        comment: line.slice(i),
      };
    }

    if (ch === '/' && next === '/' && line[i - 1] !== ':') {
      return {
        code: line.slice(0, i),
        comment: line.slice(i),
      };
    }
  }

  return {
    code: line,
    comment: '',
  };
}

function trimTrailingSpaces(output: string[]): void {
  while (output.length > 0 && output[output.length - 1] === ' ') {
    output.pop();
  }
}

function ensureSpaceBeforeToken(output: string[]): void {
  trimTrailingSpaces(output);

  if (output.length === 0) {
    return;
  }

  const previous = output[output.length - 1];
  if (previous !== ' ' && previous !== '[' && previous !== '{') {
    output.push(' ');
  }
}

function hasInlineObject(code: string): boolean {
  let inString = false;
  let escaped = false;
  let substitutionDepth = 0;
  let seenOpen = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (substitutionDepth > 0) {
      if (ch === '{') {
        substitutionDepth++;
      } else if (ch === '}') {
        substitutionDepth = Math.max(0, substitutionDepth - 1);
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '$' && next === '{') {
      substitutionDepth = 1;
      i++;
      continue;
    }

    if (ch === '{') {
      seenOpen = true;
      continue;
    }

    if (ch === '}' && seenOpen) {
      return true;
    }
  }

  return false;
}

function formatCode(code: string): string {
  const trimmed = code.trim();

  if (trimmed.length === 0) {
    return '';
  }

  const output: string[] = [];
  const inlineObject = hasInlineObject(trimmed);
  let inString = false;
  let escaped = false;
  let substitutionDepth = 0;
  let pendingSpace = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const next = i + 1 < trimmed.length ? trimmed[i + 1] : '';

    if (inString) {
      output.push(ch);

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (substitutionDepth > 0) {
      output.push(ch);

      if (ch === '{') {
        substitutionDepth++;
      } else if (ch === '}') {
        substitutionDepth = Math.max(0, substitutionDepth - 1);
      }

      continue;
    }

    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }

    if (ch === '"') {
      if (pendingSpace && output.length > 0 && output[output.length - 1] !== ' ') {
        output.push(' ');
      }

      output.push(ch);
      inString = true;
      pendingSpace = false;
      continue;
    }

    if (ch === '$' && next === '{') {
      if (pendingSpace && output.length > 0 && output[output.length - 1] !== ' ') {
        output.push(' ');
      }

      output.push('$', '{');
      substitutionDepth = 1;
      pendingSpace = false;
      i++;
      continue;
    }

    if (ch === '+' && next === '=') {
      ensureSpaceBeforeToken(output);
      output.push('+', '=');
      pendingSpace = true;
      i++;
      continue;
    }

    if (ch === '=') {
      ensureSpaceBeforeToken(output);
      output.push('=');
      pendingSpace = true;
      continue;
    }

    if (ch === ':') {
      if (next === '/' && i + 2 < trimmed.length && trimmed[i + 2] === '/') {
        output.push(':');
        pendingSpace = false;
        continue;
      }

      ensureSpaceBeforeToken(output);
      output.push(':');
      pendingSpace = true;
      continue;
    }

    if (ch === ',') {
      trimTrailingSpaces(output);
      output.push(',');
      pendingSpace = true;
      continue;
    }

    if (ch === '{') {
      trimTrailingSpaces(output);

      if (pendingSpace && output.length > 0 && output[output.length - 1] !== ' ') {
        output.push(' ');
      }

      if (
        output.length > 0 &&
        /[A-Za-z0-9_"'\)\]\}]/.test(output[output.length - 1])
      ) {
        output.push(' ');
      }

      output.push('{');

      if (inlineObject) {
        output.push(' ');
      }

      pendingSpace = false;
      continue;
    }

    if (ch === '}') {
      trimTrailingSpaces(output);

      if (inlineObject && output.length > 0 && output[output.length - 1] !== '{') {
        output.push(' ');
      }

      output.push('}');
      pendingSpace = false;
      continue;
    }

    if (ch === '[') {
      trimTrailingSpaces(output);

      if (pendingSpace && output.length > 0 && output[output.length - 1] !== ' ') {
        output.push(' ');
      }

      output.push(ch);
      pendingSpace = false;
      continue;
    }

    if (ch === ']') {
      trimTrailingSpaces(output);
      output.push(ch);
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && output.length > 0 && output[output.length - 1] !== ' ') {
      output.push(' ');
    }

    output.push(ch);
    pendingSpace = false;
  }

  trimTrailingSpaces(output);
  return output.join('');
}

function countLeadingClosers(code: string): number {
  let count = 0;

  for (const ch of code) {
    if (ch === '}' || ch === ']') {
      count++;
      continue;
    }

    break;
  }

  return count;
}

function calculateIndentDelta(code: string): number {
  let inString = false;
  let escaped = false;
  let substitutionDepth = 0;
  let delta = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (substitutionDepth > 0) {
      if (ch === '{') {
        substitutionDepth++;
      } else if (ch === '}') {
        substitutionDepth = Math.max(0, substitutionDepth - 1);
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '$' && next === '{') {
      substitutionDepth = 1;
      i++;
      continue;
    }

    if (ch === '{' || ch === '[') {
      delta++;
    } else if (ch === '}' || ch === ']') {
      delta--;
    }
  }

  return delta;
}

function getIndentUnit(options: vscode.FormattingOptions): string {
  if (!options.insertSpaces) {
    return '\t';
  }

  const size = Math.max(1, Math.floor(options.tabSize));
  return ' '.repeat(size);
}

export function formatHoconText(
  document: vscode.TextDocument,
  options: vscode.FormattingOptions
): string {
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const indentUnit = getIndentUnit(options);
  const formattedLines: string[] = [];
  let indentLevel = 0;
  let inMultilineString = false;

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const originalLine = document.lineAt(lineIndex).text;
    const trimmedStart = originalLine.trimStart();

    if (inMultilineString) {
      formattedLines.push(originalLine);

      if (countTripleQuoteTokens(originalLine) % 2 === 1) {
        inMultilineString = false;
      }

      continue;
    }

    const tripleQuotesInLine = countTripleQuoteTokens(originalLine);
    if (tripleQuotesInLine > 0) {
      formattedLines.push(originalLine);

      if (tripleQuotesInLine % 2 === 1) {
        inMultilineString = true;
      }

      continue;
    }

    if (trimmedStart.length === 0) {
      formattedLines.push('');
      continue;
    }

    if (isCommentOnlyLine(originalLine)) {
      formattedLines.push(originalLine);
      continue;
    }

    const { code, comment } = splitCodeAndComment(originalLine);
    const trimmedCode = code.trim();

    if (trimmedCode.length === 0) {
      formattedLines.push(originalLine);
      continue;
    }

    const leadingClosers = countLeadingClosers(trimmedCode);
    const currentIndent = Math.max(0, indentLevel - leadingClosers);
    const normalizedCode = formatCode(trimmedCode);
    const prefix = indentUnit.repeat(currentIndent);
    const normalizedComment = comment.trimStart();

    formattedLines.push(
      normalizedComment.length > 0
        ? `${prefix}${normalizedCode} ${normalizedComment}`
        : `${prefix}${normalizedCode}`
    );

    indentLevel = Math.max(0, indentLevel + calculateIndentDelta(trimmedCode));
  }

  return formattedLines.join(eol);
}

export function provideHoconDocumentFormattingEdits(
  document: vscode.TextDocument,
  options: vscode.FormattingOptions
): vscode.TextEdit[] {
  const originalText = document.getText();
  const formattedText = formatHoconText(document, options);

  if (formattedText === originalText) {
    return [];
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(originalText.length)
  );

  return [vscode.TextEdit.replace(fullRange, formattedText)];
}
