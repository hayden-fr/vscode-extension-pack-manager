import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import "./index.less";

interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function Input(props: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toggleFocusStatus = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputContainer.current) {
        setFocused(inputContainer.current.contains(target));
      }
    };

    document.addEventListener("mousedown", toggleFocusStatus);

    return () => {
      document.removeEventListener("mousedown", toggleFocusStatus);
    };
  }, [inputContainer.current]);

  return (
    <div ref={inputContainer} className={classNames("vscode-input", { focused })}>
      {focused ? (
        <input
          type="text"
          className="vscode-input__inner"
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          autoFocus
        />
      ) : (
        <span>{props.value}</span>
      )}
    </div>
  );
}
