import React, { ReactNode } from "react";
import "./fonts-tokens.css";
import "./colors-tokens.css";

/**
 * UIKitProvider wraps your app and injects design tokens (fonts, colors) globally.
 * Place this at the root of your app, especially when using Builder.io.
 */
interface UIKitProviderProps {
  children: ReactNode;
}

export default function UIKitProvider({ children }: UIKitProviderProps) {
  return <div style={{ fontFamily: "var(--font-family)" }}>{children}</div>;
}
