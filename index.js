// index.js — this runs before everything else
import dotenv from "dotenv";
dotenv.config();

// now import your server
await import("./server.js");