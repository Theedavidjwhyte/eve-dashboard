import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import AppContainer from "@/components/AppContainer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContainer />
  </StrictMode>,
);
