import { randomUUID } from "crypto";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { type FakeExtension } from "./core";

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

  // update extensions.json
  const extensionsFile = path.join(rootPath, "extensions.json");
  if (fs.existsSync(extensionsFile)) {
    let extensionsJson: Record<string, any>[] = JSON.parse(fs.readFileSync(extensionsFile, "utf8"));
    extensionsJson = extensionsJson.filter((item) => {
      const key = item.relativeLocation;
      return !obsoleteJson[key];
    });
    fs.writeFileSync(extensionsFile, JSON.stringify(extensionsJson));
  }
}

export function updateExtension(rootPath: string, extension: FakeExtension) {
  const filename = path.join(rootPath, "extensions.json");
  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, "[]");
  }
  const extensionsJson: Record<string, any>[] = JSON.parse(fs.readFileSync(filename, "utf8"));
  const extensionItem = extensionsJson.find((item) => item.identifier.id === extension.id);

  const extensionId = extension.id;
  const extensionVersion = extension.packageJSON.version;
  const extensionPath = extension.extensionPath;
  const relativeLocation = `${extensionId}-${extensionVersion}`;

  if (extensionItem) {
    extensionItem.version = extensionVersion;
    extensionItem.location.path = extensionPath;
    extensionItem.relativeLocation = relativeLocation;
  } else {
    extensionsJson.push({
      identifier: {
        id: extensionId,
      },
      version: extensionVersion,
      location: {
        $mid: 1,
        path: extensionPath,
        scheme: "file",
      },
      relativeLocation: relativeLocation,
      metadata: {
        installedTimestamp: Date.now(),
        source: "gallery",
        id: randomUUID(),
        publisherId: "00000000-0000-0000-0000-000000000000",
        publisherDisplayName: "Extension Manager",
        targetPlatform: "undefined",
        updated: false,
        isPreReleaseVersion: false,
        hasPreReleaseVersion: false,
      },
    });
  }
  // write back the new content to extensions.json
  fs.writeFileSync(filename, JSON.stringify(extensionsJson));
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
