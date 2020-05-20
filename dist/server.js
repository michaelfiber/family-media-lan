"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const initializePeerServer_1 = require("./initializePeerServer");
const initializeRoutes_1 = require("./initializeRoutes");
const initializeSocket_1 = require("./initializeSocket");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const app = express_1.default();
const server = http_1.default.createServer(app);
app.set('view engine', 'pug');
app.set('views', path_1.default.join(__dirname, '..', 'views'));
app.use(express_1.default.static(path_1.default.join(__dirname, 'client')));
initializeRoutes_1.InitializeRoutes(app);
initializePeerServer_1.InitializePeerServer(server, app);
initializeSocket_1.InitializeSocket(server);
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
