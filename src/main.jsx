import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./i18n";
// import './index.css'

// createRoot(document.getElementById("root")).render(
//   <StrictMode>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </StrictMode>,
// );

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
