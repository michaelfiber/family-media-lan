import express from 'express';
import path from 'path';
import http from 'http';
import { InitializePeerServer } from './initializePeerServer';
import { InitializeRoutes } from './initializeRoutes';
import { InitializeSocket } from './initializeSocket';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const app = express();
const server = http.createServer(app);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, 'client')));

InitializeRoutes(app);
InitializePeerServer(server, app);
InitializeSocket(server);

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});