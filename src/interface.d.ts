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
  [name: string]: any;
}

declare interface CommandSymbol {
  description: string;
  uniqKey: string;
}

declare interface VsCodeAPI {
  getState(): Record<string, any>;
  postMessage(message: { command: CommandSymbol; payload?: any }, transfer?: any): void;
  setState(newState: Record<string, any>): void;
}

declare function acquireVsCodeApi(): VsCodeAPI;

interface File {
  path: string;
}

type VsCodeComponent<T extends React.HTMLAttributes<any>> = React.DetailedHTMLProps<T, HTMLElement>;

interface VsCodeBadge extends React.HTMLAttributes<HTMLDivElement> {}

interface VsCodeButton extends React.HTMLAttributes<HTMLButtonElement> {
  appearance?: "primary" | "secondary" | "icon";
}
