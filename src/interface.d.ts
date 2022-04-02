/**
 * a package.json field defined for extension
 */
declare interface ExtensionManifest {
  name: string;
  version: string;
  publisher: string;
  engines: Record<string, any>;
  icon?: string;
  license?: string;
  displayName?: string;
  description?: string;
  categories?: string[];
  extensionPack?: string[];
  extensionDependencies?: string[];
  obsolete?: string;
  [name: string]: any;
}

/**
 * fake a Symbol Object for web message command
 */
declare interface CommandSymbol {
  description: string;
  uniqKey: string;
}

/**
 * postMessage api in webview
 */
declare interface VsCodeAPI {
  getState(): Record<string, any>;
  postMessage(message: { command: CommandSymbol; payload?: any }, transfer?: any): void;
  setState(newState: Record<string, any>): void;
}

declare function acquireVsCodeApi(): VsCodeAPI;

/**
 * extend File attributes
 */
interface File {
  path: string;
}
