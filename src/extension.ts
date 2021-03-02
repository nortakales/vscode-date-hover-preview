import * as vscode from 'vscode';
import DateHoverProvider from './DateHoverProvider';

export function activate(context: vscode.ExtensionContext) {
	const dateHoverProvider = new DateHoverProvider();
	const disposable = vscode.languages.registerHoverProvider('*', dateHoverProvider);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
