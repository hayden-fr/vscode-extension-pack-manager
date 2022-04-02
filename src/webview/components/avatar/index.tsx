import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import classNames from "classnames";

/**
 * Vscode Extension Avatar, preview extension icon and upload custom picture
 */
export default function Avatar(props: {
  src?: string;
  onChange?: (filename: string) => void;
  disabled?: boolean;
}) {
  const [imgUrl, setImgUrl] = useState(props.src);
  const InputRef = useRef<HTMLInputElement | null>(null);

  const handleChangeImage = () => props.disabled || InputRef.current?.click();

  useEffect(() => {
    setImgUrl(props.src);
  }, [props.src]);

  useEffect(() => {
    const changeImage = (event: any) => {
      const file = (event as ChangeEvent<HTMLInputElement>).target.files?.item(0);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const iconBase64 = reader.result as string;
          setImgUrl(iconBase64);
          props.onChange?.(iconBase64);
        };
        reader.readAsDataURL(file);
      }
    };
    InputRef.current && InputRef.current.addEventListener("change", changeImage);
    return () => {
      InputRef.current && InputRef.current.removeEventListener("change", changeImage);
    };
  }, [InputRef.current, props.onChange]);

  return (
    <div className={classNames("avatar", { disabled: props.disabled })} onClick={handleChangeImage}>
      <img src={imgUrl} alt="" className="icon" />
      <input ref={InputRef} type="file" accept="image/*" style={{ display: "none" }} />
    </div>
  );
}
