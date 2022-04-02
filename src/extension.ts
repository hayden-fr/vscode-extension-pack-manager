// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ExtensionWebview } from "./webview/webview";
import { defaultManifest, Extensions, FakeExtension } from "./utils/core";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // ExtensionWebview.bundleContext(context);

  const extensionRootPath = path.dirname(context.extensionPath);
  const extensionWebview = new ExtensionWebview(context, extensionRootPath);

  // ---------------------  register vscode command  ---------------------

  // create new custom extension pack
  context.subscriptions.push(
    vscode.commands.registerCommand("extension-manager.extension.create", async () => {
      const { publisher, name, version } = defaultManifest;
      const extensionDir = `${publisher}.${name}-${version}`;
      const extensionAbsolutePath = path.join(extensionRootPath, extensionDir);
      const extension = new FakeExtension(extensionAbsolutePath);
      extensionWebview.loadExtension(extension);
    })
  );

  // edit custom extension pack
  context.subscriptions.push(
    vscode.commands.registerCommand("extension-manager.extension.edit", (extensionId: string) => {
      if (typeof extensionId === "string") {
        const extensions = new Extensions(extensionRootPath);
        const extension = extensions.getExtension(extensionId);
        if (extension) {
          extensionWebview.loadExtension(extension);
        } else {
          vscode.window.showInformationMessage("Extension uninstalled");
        }
      }
    })
  );

  // view custom extension pack
  context.subscriptions.push(
    vscode.commands.registerCommand("extension-manager.extension.view", async () => {
      vscode.commands.executeCommand(
        "workbench.extensions.search",
        '@installed @category:"Custom Extension"'
      );
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
