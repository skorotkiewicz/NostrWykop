import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./i18n";

const Root = () => {
  const AppWithRouter = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  if (import.meta.env.DEV) {
    return AppWithRouter;
  }

  return <StrictMode>{AppWithRouter}</StrictMode>;
};

createRoot(document.getElementById("root")).render(<Root />);
