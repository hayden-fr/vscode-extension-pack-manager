import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";

function splitWord(content: string) {
  return content.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[ _\-]/);
}

export function kebabCase(content: string) {
  const words = splitWord(content);
  const validWords = words.filter(Boolean).map((w) => w.toLowerCase());
  return validWords.join("-");
}

function UpperCase(content: string) {
  return content.replace(/^(\w)(.*)/, (match, p1, p2) => `${p1.toUpperCase()}${p2}`);
}

export function startCase(content: string) {
  const words = splitWord(content);
  const validWords = words.filter(Boolean).map(UpperCase);
  return validWords.join(" ");
}

export function toLowerPreposition(content: string) {
  return content.replace("For", "for");
}

export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

export function getExtensionsRootPath() {
  return path.join(os.homedir(), ".vscode/extensions");
}
