// admin/src/services/adminSocket.js
import { API_ORIGIN } from "./api"; // must export API_ORIGIN in services/api
import { io } from "socket.io-client";

// connect specifically to the /admin namespace on the backend
const NAMESPACE = "/admin";
const url = (API_ORIGIN || "").replace(/\/$/, ""); // remove trailing slash if any
const adminSocket = io(`${url}${NAMESPACE}`, { transports: ["websocket", "polling"] });

export default adminSocket;
