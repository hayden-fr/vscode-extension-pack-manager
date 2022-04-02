import { createContext } from "react";

export const vscode = acquireVsCodeApi();

export const Context = createContext({ localize: (key: string, message: string) => message });
