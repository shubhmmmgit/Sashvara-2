// admin/src/index.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { API_ORIGIN } from "./services/api";
import { io } from "socket.io-client";
import adminSocket from "./services/adminSocket"; 

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Admin client socket (admin should only listen for live events, not emit newVisitor)
adminSocket.on("connect", () => {
  console.debug("admin socket connected", adminSocket.id);
});
adminSocket.on("disconnect", (reason) => {
  console.debug("admin socket disconnected:", reason);
});
adminSocket.on("connect_error", (err) => {
  console.warn("admin socket connect_error:", err.message);
})