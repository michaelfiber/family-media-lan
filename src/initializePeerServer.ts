import { ExpressPeerServer } from 'peer';
import http from 'http';
import express from 'express';

export function InitializePeerServer(server: http.Server, app: express.Application) {
    const peerServer = ExpressPeerServer(server, {
        path: '/'
    });

    peerServer.on('connection', (client) => {
        console.log('peer connected', client.getId());
    });

    app.use('/peerjs', peerServer);
}