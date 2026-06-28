import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { GuildApp } from "./ui/guild/GuildApp";
import "./ui/styles.css";

// Minimal hash router. The project had no router or start screen, so the guild
// layer reaches its own self-contained screen at #/guild (additive; the
// classic kingdom remains the default). See web/ASSET_REPORT.md.
function Root() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.startsWith("#/guild") ? <GuildApp /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
