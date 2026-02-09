import { io } from "socket.io-client";

const ADMIN_ORIGIN = import.meta.env.VITE_API_ORIGIN || "https://sashvara-2.onrender.com";

const adminSocket = io(ADMIN_ORIGIN, {
  transports: ["websocket"],
  path: "/socket.io",
  autoConnect: true,
});

adminSocket.on("connect", () => console.log("adminSocket connected id:", adminSocket.id));
adminSocket.on("connect_error", (err) => console.error("adminSocket connect_error:", err && err.message));
adminSocket.on("liveVisitor", (p) => console.log("adminSocket liveVisitor received:", p));

export default adminSocket;
