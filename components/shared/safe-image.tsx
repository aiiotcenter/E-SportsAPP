"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackText?: string;
  fallbackClassName?: string;
}

export function SafeImage({
  fallbackText,
  fallbackClassName,
  alt,
  src,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <span
        className={
          fallbackClassName || "text-[10px] font-bold text-text-2"
        }
      >
        {fallbackText || alt?.[0] || "?"}
      </span>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      style={{ width: "auto", height: "auto", ...props.style }}
      onError={() => setHasError(true)}
    />
  );
}
