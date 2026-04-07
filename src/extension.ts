// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function findInlineCommentStart(line: string): number {
  let inString = false;
  let escaped = false;

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

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '#') {
      return i;
    }

    if (ch === '/' && next === '/' && (i === 0 || /\s/.test(line[i - 1]))) {
      return i;
    }
  }

  return -1;
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
  let delta = 0;

  for (const ch of code) {
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

    if (ch === '"') {
      inString = true;
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

function trimTrailingSpaces(buffer: string[]): void {
  while (buffer.length > 0 && buffer[buffer.length - 1] === ' ') {
    buffer.pop();
  }
}

function formatOperators(code: string): string {
  const output: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

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

    if (ch === '"') {
      inString = true;
      output.push(ch);
      continue;
    }

    if (ch === '+' && next === '=') {
      trimTrailingSpaces(output);
      output.push(' ', '+', '=', ' ');
      i++;
      while (i + 1 < code.length && /\s/.test(code[i + 1])) {
        i++;
      }
      continue;
    }

    if (ch === ':') {
      if (next === '/' && i + 2 < code.length && code[i + 2] === '/') {
        output.push(ch);
        continue;
      }

      trimTrailingSpaces(output);
      output.push(' ', ':', ' ');
      while (i + 1 < code.length && /\s/.test(code[i + 1])) {
        i++;
      }
      continue;
    }

    if (ch === '=') {
      trimTrailingSpaces(output);
      output.push(' ', '=', ' ');
      while (i + 1 < code.length && /\s/.test(code[i + 1])) {
        i++;
      }
      continue;
    }

    output.push(ch);
  }

  return output.join('').trimEnd();
}

function formatHoconText(document: vscode.TextDocument): string {
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const formattedLines: string[] = [];
  let indentLevel = 0;

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const originalLine = document.lineAt(lineIndex).text;
    const trimmedStart = originalLine.trimStart();

    if (trimmedStart.length === 0) {
      formattedLines.push('');
      continue;
    }

    if (trimmedStart.startsWith('#') || trimmedStart.startsWith('//')) {
      formattedLines.push(originalLine);
      continue;
    }

    const commentStart = findInlineCommentStart(originalLine);
    const codePart =
      commentStart >= 0 ? originalLine.slice(0, commentStart) : originalLine;
    const commentPart =
      commentStart >= 0 ? originalLine.slice(commentStart) : '';
    const trimmedCode = codePart.trim();

    if (trimmedCode.length === 0) {
      formattedLines.push(originalLine);
      continue;
    }

    const leadingClosers = countLeadingClosers(trimmedCode);
    const currentIndent = Math.max(0, indentLevel - leadingClosers);
    const normalizedCode = formatOperators(trimmedCode);
    const indent = '  '.repeat(currentIndent);
    const formattedLine =
      commentPart.length > 0
        ? `${indent}${normalizedCode} ${commentPart}`
        : `${indent}${normalizedCode}`;

    formattedLines.push(formattedLine);
    indentLevel = Math.max(0, indentLevel + calculateIndentDelta(trimmedCode));
  }

  return formattedLines.join(eol);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'hocon',
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): vscode.TextEdit[] {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        const formattedText = formatHoconText(document);
        return [vscode.TextEdit.replace(fullRange, formattedText)];
      },
    }
  );

  context.subscriptions.push(formatter);
}

// This method is called when your extension is deactivated
export function deactivate() {}
