"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="../../socket-actions.d.ts" />
const vue_1 = __importDefault(require("vue"));
const socket_io_1 = __importDefault(require("socket.io"));
const peerjs_1 = __importDefault(require("peerjs"));
window.addEventListener('DOMContentLoaded', () => {
    let AlarmSound = new Audio('/sounds/slow-spring-board.mp3');
    let BellSound = new Audio('/sounds/front-desk-bells-daniel_simon.mp3');
    let clientName = localStorage.getItem('settings.clientName');
    let peer = null;
    let socket = socket_io_1.default();
    let clockTimeout;
    let clockTimeoutAmount = 5 * 60 * 1000;
    let app = new vue_1.default({
        el: '#app',
        data: {
            clientName: clientName,
            currentAlbum: null,
            albums: [],
            currentSong: null,
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
            widgetMessages: new Map(),
            popups: [],
            weather: {
                temp: '',
                feelsLike: '',
                iconUrl: '',
                description: ''
            },
            settings: {
                show: false,
                clientName: clientName || '',
                clientList: [],
                showDialerModal: false,
                mediaStream: null,
                theirStream: null,
                call: null,
                theirId: ''
            },
            buzzer: {
                show: false,
                openForBuzz: false,
                youWon: false
            },
            fullScreenElement: null
        },
        methods: {
            updateClockTimeout: function () {
                if (clockTimeout)
                    clearTimeout(clockTimeout);
                clockTimeout = setTimeout(() => {
                    this.showClock = true;
                }, clockTimeoutAmount);
            },
            playSong: function (album, song) {
                if (this.currentSong !== song) {
                    // check for question before playing.
                    if (Math.random() * 100 < this.questionLevel) {
                        alert('ask a question before allowing music to play!');
                    }
                    this.currentSong = song;
                    if (this.audio)
                        this.audio.pause();
                    this.audio = new Audio(this.currentSong.path);
                }
                if (album.volumes[song.name])
                    this.audio.volume = album.volumes[song.name] * this.masterVolume;
                else
                    this.audio.volume = this.masterVolume;
                this.audio.play();
                this.paused = false;
                let params = {
                    songName: song.name,
                    albumName: album.name
                };
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
                if (this.currentSong)
                    this.currentSong = null;
            },
            hideClock: function () {
                this.showClock = false;
            },
            clearPopup: function (popup) {
                if (popup.timeoutId)
                    clearTimeout(popup.timeoutId);
                this.popups.splice(this.popups.indexOf(popup), 1);
            },
            getPrettyTimer,
            buzz: function () {
                if (this.buzzer.show && this.buzzer.openForBuzz)
                    socket.emit('buzz');
            },
            requestFullScreen: function () {
                if (document.documentElement.requestFullscreen)
                    document.documentElement.requestFullscreen();
                app.fullScreenElement = document.fullscreenElement;
            },
            videoCall: async function (peerId) {
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
            hangUp: function (suppressEmit) {
                if (this.settings.call) {
                    this.settings.call.close();
                }
                if (this.settings.mediaStream)
                    this.settings.mediaStream.getTracks().forEach(track => track.stop());
                if (this.settings.theirStream)
                    this.settings.theirStream.getTracks().forEach(track => track.stop());
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
    });
    getMasterVolume().then((volume) => {
        app.masterVolume = volume;
    });
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
        app.masterPause = false;
    });
    socket.on('new-volume', async () => {
        app.masterVolume = await getMasterVolume();
        if (app.currentAlbum && app.currentSong) {
            let songVolume = app.currentAlbum.volumes[app.currentSong.name] ? app.currentAlbum.volumes[app.currentSong.name] * app.masterVolume : app.masterVolume;
            if (app.audio)
                app.audio.volume = songVolume;
        }
    });
    socket.on('question-level', (level) => {
        app.questionLevel = level;
    });
    socket.on('show-clock', () => {
        app.showClock = true;
    });
    let serverTimers = new Map();
    socket.on('timer-update', (id, name, secondsLeft) => {
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
    socket.on('timer-done', async (id, quiet) => {
        let timer = serverTimers.get(id);
        if (timer) {
            if (!quiet) {
                let newPopup = {
                    message: timer.name + ' is done!'
                };
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
    socket.on('update-weather', (temp, feelsLike, iconUrl, description) => {
        app.weather.temp = temp;
        app.weather.feelsLike = feelsLike;
        app.weather.iconUrl = iconUrl;
        app.weather.description = description;
    });
    socket.on('client-list', (clientList) => {
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
        app.buzzer.youWon = false;
        app.buzzer.openForBuzz = false;
    });
    socket.on('buzzer-win', () => {
        app.buzzer.youWon = true;
        BellSound.currentTime = 0;
        BellSound.play();
        let newPopup = {
            message: 'You Win!'
        };
        app.popups.push(newPopup);
        newPopup.timeoutId = setTimeout(() => {
            app.popups.splice(app.popups.indexOf(newPopup), 1);
        }, 2000);
    });
    app.updateClockTimeout();
    setInterval(() => {
        app.fullScreenElement = document.fullscreenElement;
    }, 1000);
    console.log('buzzer show', app.buzzer.show);
    if (clientName) {
        socket.emit('get-peer-id');
        socket.on('peer-id-revoked', () => {
            console.log('peer id revoked');
        });
        socket.on('get-peer-id', (id) => {
            console.log('setting up peer', id);
            let peerOptions = {
                host: '/',
                port: parseInt(document.location.port, 10),
                path: '/peerjs/'
            };
            peer = new peerjs_1.default(id);
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
