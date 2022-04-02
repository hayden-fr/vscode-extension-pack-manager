import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * @deprecated not need convert special words
 * @param content
 * @returns
 */
export function toLowerPreposition(content: string) {
  return content.replace("For", "for");
}

/**
 * covert strings to vscode uri object
 * @param webview
 * @param extensionUri
 * @param pathList
 * @returns
 */
export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

/**
 * update obsolete extension
 * @param rootPath
 * @param content
 */
export function updateObsolete(rootPath: string, content: Record<string, boolean>) {
  const filename = path.join(rootPath, ".obsolete");
  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, "{}");
  }
  const obsoleteJson: Record<string, boolean> = JSON.parse(fs.readFileSync(filename, "utf8"));
  Object.assign(obsoleteJson, content);
  // filter out extensions that don't exist and newly installed
  const obsoleteContent = Object.keys(obsoleteJson).reduce((content, dirname) => {
    if (obsoleteJson[dirname] && fs.existsSync(path.join(rootPath, dirname))) {
      content[dirname] = true;
    }
    return content;
  }, {} as Record<string, boolean>);
  // write back the new content to .obsolete
  fs.writeFileSync(filename, JSON.stringify(obsoleteContent));
}

/**
 * use current date time generate version
 */
export function genCurrentVersion() {
  return new Date()
    .toLocaleString("zh-CN", { hour12: false })
    .replace(/\//g, ".")
    .replace(/[:\s]/g, "");
}
