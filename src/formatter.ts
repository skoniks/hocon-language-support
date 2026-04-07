import * as vscode from 'vscode';

const INDENT = '  ';

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

function findAssignmentOperator(
  code: string
): { index: number; length: number } | undefined {
  let inString = false;
  let escaped = false;
  let substitutionDepth = 0;

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

    if (ch === '+' && next === '=') {
      return {
        index: i,
        length: 2,
      };
    }

    if (ch === '=') {
      return {
        index: i,
        length: 1,
      };
    }

    if (ch === ':') {
      if (next === '/' && i + 2 < code.length && code[i + 2] === '/') {
        continue;
      }

      return {
        index: i,
        length: 1,
      };
    }
  }

  return undefined;
}

function formatCode(code: string): string {
  const trimmed = code.trim();

  if (trimmed.length === 0) {
    return '';
  }

  const assignmentOperator = findAssignmentOperator(trimmed);

  if (!assignmentOperator) {
    return trimmed;
  }

  const left = trimmed.slice(0, assignmentOperator.index).trimEnd();
  const operator = trimmed.slice(
    assignmentOperator.index,
    assignmentOperator.index + assignmentOperator.length
  );
  const right = trimmed
    .slice(assignmentOperator.index + assignmentOperator.length)
    .trimStart();

  return `${left} ${operator} ${right}`.trimEnd();
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

export function formatHoconText(document: vscode.TextDocument): string {
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
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
    const prefix = INDENT.repeat(currentIndent);
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
  document: vscode.TextDocument
): vscode.TextEdit[] {
  const originalText = document.getText();
  const formattedText = formatHoconText(document);

  if (formattedText === originalText) {
    return [];
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(originalText.length)
  );

  return [vscode.TextEdit.replace(fullRange, formattedText)];
}
