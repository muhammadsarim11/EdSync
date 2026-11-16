import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import ConnectDB from './config/db.js';
import validateEnv from './config/validateEnv.js';
import app from './app.js';
import { initChatSocket } from './sockets/chat.socket.js';

validateEnv();
ConnectDB();

const httpServer = http.createServer(app);
initChatSocket(httpServer);

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
