import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./ui/Root";
import "./ui/theme/tokens.css";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
