import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import App from "./App.jsx";
import "./i18n";

const Root = () => {
  const AppWithRouter = (
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  );

  if (import.meta.env.DEV) {
    return AppWithRouter;
  }

  return <StrictMode>{AppWithRouter}</StrictMode>;
};

createRoot(document.getElementById("root")).render(<Root />);
