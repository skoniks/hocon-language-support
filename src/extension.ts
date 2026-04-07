import * as vscode from 'vscode';
import { provideHoconDocumentFormattingEdits } from './formatter.js';

export function activate(context: vscode.ExtensionContext) {
  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    'hocon',
    {
      provideDocumentFormattingEdits(document: vscode.TextDocument) {
        return provideHoconDocumentFormattingEdits(document);
      },
    }
  );

  context.subscriptions.push(formatter);
}

export function deactivate() {}
