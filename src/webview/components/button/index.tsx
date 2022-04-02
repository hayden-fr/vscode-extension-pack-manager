import classNames from "classnames";
import "./index.less";

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

/**
 * Vscode Button Component, replace WebComponent vscode-button
 */
export default function Button(props: ButtonProps) {
  const { disabled } = props;
  const className = classNames("vscode-button", props.className, {
    ["disabled"]: disabled,
  });
  return <button {...props} className={className}></button>;
}
