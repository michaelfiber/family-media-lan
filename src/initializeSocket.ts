import http from 'http';
import socketIo from 'socket.io';
import { getVolume, setVolume } from './volume';
import { addAlbum, getAlbums } from './getAlbums';
import { exec } from 'child_process';
import { v4 } from 'uuid';
import path from 'path';
import { ServerTimer } from './serverTimer';

export function InitializeSocket(server: http.Server) {
    const io = socketIo(server);

    let showBuzzer = false;
    let buzzerOpen = false;

    let socketIdToClientName = new Map<string, string>();
    let socketIdToPeerId = new Map<string, string>();
    let serverTimers = new Map<string, ServerTimer>();

    function getClientList() {
        let clientList: Array<{
            socketId: string;
            clientName: string;
            peerId?: string;
        }> = [];
        socketIdToClientName.forEach((value, key) => {
            clientList.push({
                socketId: key,
                clientName: value,
                peerId: socketIdToPeerId.get(key)
            });
        });
        return clientList;
    }


    io.on('connection', (socket) => {
        console.log('socket connected', socket.id);

        // automatically send new connections the client list.
        console.log('sending client list', socket.id);
        socket.emit('client-list', getClientList());

        // send buzzer info
        // by default buzzer is hidden and closed on the client. If the client connects while its shown or open, let it know.
        if (showBuzzer) socket.emit('buzzer-show');
        if (buzzerOpen) socket.emit('buzzer-open');

        socket.on('disconnect', () => {
            console.log('socket disconnected', socket.id);
            socketIdToClientName.delete(socket.id);
            socketIdToPeerId.delete(socket.id);
            io.emit('client-list', getClientList());
        });

        socket.on('reload', () => {
            io.emit('reload');
        });
        socket.on('pause', () => {
            io.emit('pause');
        });
        socket.on('unpause', () => {
            io.emit('unpause');
        });
        socket.on('volume-down', async () => {
            let volume = await getVolume();
            let newVolume = volume - 0.1;
            if (newVolume < 0) newVolume = 0;
            await setVolume(newVolume);
            io.emit('new-volume');
        });
        socket.on('volume-up', async () => {
            let volume = await getVolume();
            let newVolume = volume + 0.1;
            if (newVolume > 1) newVolume = 1;
            await setVolume(newVolume);
            io.emit('new-volume');
        });
        socket.on('get-youtube-video', async (youtubeAlbum: string, youtubeLink: string, youtubeNiceName: string) => {
            exec(`youtube-dl --extract-audio --audio-format mp3 --write-thumbnail ${youtubeLink} -v --postprocessor-args "-id3v2_version 3" -o "${path.join('dist', 'client', 'albums', youtubeAlbum, youtubeNiceName, '%(title)s.%(ext)s')}"`, (err, stdout, stderr) => {
                if (err) {
                    console.log('exec error', err);
                }
                if (stdout) {
                    console.log('stdout', stdout);
                }
                if (stderr) {
                    console.log('stderr', stderr);
                }

                socket.emit('get-youtube-video');
            });
        });
        socket.on('add-album', async (data: { name: string; img: string }) => {
            await addAlbum(data.name, data.img);
            socket.emit('add-album', data.name);
        });

        socket.on('show-clock', () => {
            io.emit('show-clock');
        });

        function serverTimerUpdateCallback(id: string, name: string, secondsLeft: number) {
            io.emit('timer-update', id, name, secondsLeft);
        }

        function serverTimerDoneCallback(id: string, quiet?: boolean) {
            console.log('done');
            io.emit('timer-done', id, quiet);
            let timer = serverTimers.get(id);
            if (timer) {
                timer.removeAllListeners();
                serverTimers.delete(id);
            }
        }

        socket.on('start-timer', (name: string, duration: number) => {
            let timer = new ServerTimer(v4(), name, duration);
            timer.on('update', serverTimerUpdateCallback);
            timer.on('done', serverTimerDoneCallback);
            serverTimers.set(timer.id, timer);
        });

        socket.on('cancel-timer', (id: string) => {
            console.log('cancel timer request', id);
            let timer = serverTimers.get(id);
            console.log(timer);
            if (timer) {
                console.log('found timer');
                timer.cancel();
            }
        });

        socket.on('client-name', (clientName: string) => {
            console.log('set new client name', clientName, socket.id);
            socketIdToClientName.set(socket.id, clientName);
            console.log('sending client list to everybody');
            io.emit('client-list', getClientList());
        });

        socket.on('buzzer-show', () => {
            io.emit('buzzer-show');
            showBuzzer = true;
        });

        socket.on('buzzer-hide', () => {
            io.emit('buzzer-hide');
            showBuzzer = false;
        });

        socket.on('buzzer-open', () => {
            io.emit('buzzer-open');
            buzzerOpen = true;
        });

        socket.on('buzzer-close', () => {
            io.emit('buzzer-close');
            buzzerOpen = false;
        });

        socket.on('buzz', () => {
            if (showBuzzer && buzzerOpen) {
                buzzerOpen = false;
                io.emit('buzzer-close');
                socket.emit('buzzer-win');
            }
        });

        socket.on('get-peer-id', () => {
            let peerId = v4();
            socketIdToPeerId.set(socket.id, peerId);
            socket.emit('get-peer-id', peerId);
            io.emit('client-list', getClientList());
        });

        socket.on('hang-up', (peerId: string) => {
            console.log('hang-up', peerId)
            for (let pair of socketIdToPeerId) {
                if (pair[1] == peerId) {
                    console.log('send hangup to', pair[0]);
                    io.sockets.connected[pair[0]].emit('hang-up');
                    break;
                }
            }
        });

        setupParent(socket);
    })

    function setupParent(socket: socketIo.Socket) {
        socket.on('parent-new-album', async (newAlbumName: string) => {
            await addAlbum(newAlbumName, undefined, 'adult-albums')
            io.emit('parent-new-album', newAlbumName);
        });

        socket.on('parent-get-albums', async () => {
            let albums = await getAlbums('adult-albums');
            socket.emit('parent-get-albums', albums);
        });
    }

}