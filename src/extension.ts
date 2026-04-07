import * as vscode from 'vscode';
import { provideHoconDocumentFormattingEdits } from './formatter.js';

export function activate(context: vscode.ExtensionContext) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'hocon',
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
      ) {
        return provideHoconDocumentFormattingEdits(document, options);
      },
    }
  );

  context.subscriptions.push(formatter);
}

export function deactivate() {}
