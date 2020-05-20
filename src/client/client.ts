///<reference path="../../socket-actions.d.ts" />
import Vue from 'vue';
import io from 'socket.io';
import Peer from 'peerjs';

window.addEventListener('DOMContentLoaded', () => {

    let AlarmSound = new Audio('/sounds/slow-spring-board.mp3');
    let BellSound = new Audio('/sounds/front-desk-bells-daniel_simon.mp3');

    let clientName = localStorage.getItem('settings.clientName');

    let peer = null as null | Peer;

    let socket = io();

    let clockTimeout: NodeJS.Timeout;
    let clockTimeoutAmount = 5 * 60 * 1000;

    let app = new Vue({
        el: '#app',
        data: {
            clientName: clientName,
            currentAlbum: null as null | Album,
            albums: [] as Array<Album>,
            currentSong: null as null | Song,
            audio: new Audio(),
            waitingToPlay: false,
            paused: false,
            length: 0,
            currentTime: 0,
            volume: 0,
            masterVolume: 1,
            masterPause: false,
            questionLevel: 0,
            time: new Date().toLocaleTimeString(),
            showClock: false,
            firstClick: false,
            widgetMessages: new Map<string, string>(),
            popups: [] as Popup[],
            weather: {
                temp: '',
                feelsLike: '',
                iconUrl: '',
                description: ''
            },
            settings: {
                show: false,
                clientName: clientName || '',
                clientList: [] as Array<{ socketId: string; clientName: string; peerId?: string; }>,
                showDialerModal: false,
                mediaStream: null as null | MediaStream,
                theirStream: null as null | MediaStream,
                call: null as null | Peer.MediaConnection,
                theirId: ''
            },
            buzzer: {
                show: false,
                openForBuzz: false,
                youWon: false
            },
            fullScreenElement: null as null | Element
        },
        methods: {
            updateClockTimeout: function () {
                if (clockTimeout) clearTimeout(clockTimeout);
                clockTimeout = setTimeout(() => {
                    this.showClock = true
                }, clockTimeoutAmount);
            },
            playSong: function (album: Album, song: Song) {
                if (this.currentSong !== song) {

                    // check for question before playing.
                    if (Math.random() * 100 < this.questionLevel) {
                        alert('ask a question before allowing music to play!')
                    }

                    this.currentSong = song;
                    if (this.audio) this.audio.pause();
                    this.audio = new Audio(this.currentSong.path);
                }

                if (album.volumes[song.name]) this.audio.volume = album.volumes[song.name] * this.masterVolume;
                else this.audio.volume = this.masterVolume;

                this.audio.play();
                this.paused = false;

                let params: PlayParams = {
                    songName: song.name,
                    albumName: album.name
                }

                socket.emit('play', params);
            },
            pauseSong: function () {
                if (this.audio) {
                    this.audio.pause();
                    this.paused = this.audio.paused;
                }
            },
            stopSong: function () {
                if (this.audio) {
                    this.audio.pause();
                    this.paused = false;
                }

                if (this.currentSong) this.currentSong = null;
            },
            hideClock: function () {
                this.showClock = false;
            },
            clearPopup: function (popup: Popup) {
                if (popup.timeoutId) clearTimeout(popup.timeoutId);
                this.popups.splice(this.popups.indexOf(popup), 1);
            },
            getPrettyTimer,
            buzz: function () {
                if (this.buzzer.show && this.buzzer.openForBuzz) socket.emit('buzz');
            },
            requestFullScreen: function () {
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                app.fullScreenElement = document.fullscreenElement;
            },
            videoCall: async function(peerId: string) {
                if (peer) {
                    this.settings.theirId = peerId;
                    this.settings.mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'user'
                        },
                        audio: true
                    });

                    this.settings.call = peer.call(peerId, this.settings.mediaStream);
                    this.settings.call.on('stream', (stream) => {
                        app.settings.theirStream = stream;
                    });
                }
            },
            hangUp: function(suppressEmit?: boolean) {
                if (this.settings.call) {
                    this.settings.call.close();
                }
                if (this.settings.mediaStream) this.settings.mediaStream.getTracks().forEach(track => track.stop());
                if (this.settings.theirStream) this.settings.theirStream.getTracks().forEach(track => track.stop());

                this.settings.call = null;
                this.settings.mediaStream = null;
                this.settings.theirStream = null;

                socket.emit('hang-up', this.settings.theirId);
                this.settings.theirId = '';
            }
        },
        watch: {
            'settings.clientName': function () {
                localStorage.setItem('settings.clientName', this.settings.clientName);
                socket.emit('client-name', this.settings.clientName);
            }
        }
    });

    socket.emit('client-name', app.settings.clientName);

    getAlbums().then((albums) => {
        albums.forEach(album => app.albums.push(album));
        app.currentAlbum = app.albums[0];
    })

    getMasterVolume().then((volume) => {
        app.masterVolume = volume;
    })

    setInterval(() => {
        if (app.audio) {
            app.currentTime = app.audio.currentTime;
            app.length = app.audio.duration;
        }
    }, 200);

    setInterval(() => {
        app.time = new Date().toLocaleTimeString();
    }, 1000);

    socket.on('reload', () => {
        document.location.reload();
    });

    socket.on('pause', () => {
        app.pauseSong();
        app.masterPause = true;
    });

    socket.on('unpause', () => {
        if (app.paused && app.currentAlbum && app.currentSong) {
            app.playSong(app.currentAlbum, app.currentSong);
        }
        app.masterPause = false
    });

    socket.on('new-volume', async () => {
        app.masterVolume = await getMasterVolume();
        if (app.currentAlbum && app.currentSong) {
            let songVolume = app.currentAlbum.volumes[app.currentSong.name] ? app.currentAlbum.volumes[app.currentSong.name] * app.masterVolume : app.masterVolume;
            if (app.audio) app.audio.volume = songVolume;
        }
    });

    socket.on('question-level', (level: number) => {
        app.questionLevel = level;
    });

    socket.on('show-clock', () => {
        app.showClock = true;
    });

    let serverTimers = new Map<string, { id: string; name: string; secondsLeft: number }>();

    socket.on('timer-update', (id: string, name: string, secondsLeft: number) => {
        let timer = serverTimers.get(id);
        if (!timer) {
            timer = {
                id,
                name,
                secondsLeft
            };
        }
        timer.secondsLeft = secondsLeft;
        timer.name = name;

        app.widgetMessages.set(id, app.getPrettyTimer(secondsLeft) + ' remains on ' + name);
        serverTimers.set(id, timer);
    });

    socket.on('timer-done', async (id: string, quiet?: boolean) => {
        let timer = serverTimers.get(id);
        if (timer) {
            if (!quiet) {
                let newPopup: Popup = {
                    message: timer.name + ' is done!'
                }
                newPopup.timeoutId = setTimeout(() => {
                    app.popups.splice(app.popups.indexOf(newPopup), 1);
                }, 30000);
                app.popups.push(newPopup);

                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        AlarmSound.currentTime = 0;
                        AlarmSound.play();
                        await sleep(1000);
                    }
                    await sleep(3);
                }
            }
            serverTimers.delete(id);
        }
        app.widgetMessages.delete(id);
    });

    socket.on('update-weather', (temp: string, feelsLike: string, iconUrl: string, description: string) => {
        app.weather.temp = temp;
        app.weather.feelsLike = feelsLike;
        app.weather.iconUrl = iconUrl;
        app.weather.description = description;
    });

    socket.on('client-list', (clientList: Array<{
        socketId: string;
        clientName: string;
        peerId?: string;
    }>) => {
        console.log('got client list', clientList);
        app.settings.clientList.splice(0, app.settings.clientList.length, ...clientList);
    });

    socket.on('buzzer-show', () => {
        app.buzzer.show = true;
        app.buzzer.openForBuzz = false;
        app.buzzer.youWon = false;
    });

    socket.on('buzzer-hide', () => {
        app.buzzer.show = false;
    });

    socket.on('buzzer-open', () => {
        app.buzzer.youWon = false;
        app.buzzer.openForBuzz = true;
    });

    socket.on('buzzer-close', () => {
        app.buzzer.youWon = false
        app.buzzer.openForBuzz = false;
    })

    socket.on('buzzer-win', () => {
        app.buzzer.youWon = true;
        BellSound.currentTime = 0;
        BellSound.play();
        let newPopup: Popup = {
            message: 'You Win!'
        }
        app.popups.push(newPopup);
        newPopup.timeoutId = setTimeout(() => {
            app.popups.splice(app.popups.indexOf(newPopup), 1)
        }, 2000);
    });

    app.updateClockTimeout();

    setInterval(() => {
        app.fullScreenElement = document.fullscreenElement;
    }, 1000)

    console.log('buzzer show', app.buzzer.show);


    if (clientName) {
        socket.emit('get-peer-id');

        socket.on('peer-id-revoked', () => {
            console.log('peer id revoked');
        });

        socket.on('get-peer-id', (id: string) => {

            console.log('setting up peer', id);

            let peerOptions: Peer.PeerJSOption = {
                host: '/',
                port: parseInt(document.location.port, 10),
                path: '/peerjs/'
            }

            peer = new Peer(id);

            peer.on('open', (id) => {
                console.log('connect!');
                console.log('connected to peer system as', id);
            });

            peer.on('call', async (call) => {
                app.settings.mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user'
                    },
                    audio: true
                });

                call.answer(app.settings.mediaStream);
                call.on('stream', (stream) => {
                    app.settings.theirStream = stream;
                });
                app.settings.call = call;
                app.settings.theirId = call.peer;
            });
        });

        socket.on('hang-up', () => {
            console.log('hang up!');
            app.hangUp(true);
        });
    }

});