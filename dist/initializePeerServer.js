"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const peer_1 = require("peer");
function InitializePeerServer(server, app) {
    const peerServer = peer_1.ExpressPeerServer(server, {
        path: '/'
    });
    peerServer.on('connection', (client) => {
        console.log('peer connected', client.getId());
    });
    app.use('/peerjs', peerServer);
}
exports.InitializePeerServer = InitializePeerServer;
