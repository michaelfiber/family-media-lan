"use strict";
///<reference path="../../socket-actions.d.ts" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = __importDefault(require("vue"));
const socket_io_1 = __importDefault(require("socket.io"));
function getAlbums() {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/albums');
        xhr.addEventListener('load', function () {
            let data = JSON.parse(this.response);
            console.log(JSON.stringify(data, null, 2));
            resolve(data);
        });
        xhr.send();
    });
}
function getMasterVolume() {
    return new Promise((resolve, reject) => {
        console.log('get new volume');
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/volume');
        xhr.addEventListener('load', function () {
            console.log('volume response', this.response);
            let data = JSON.parse(this.response);
            console.log(JSON.stringify(data, null, 2));
            if (typeof data.volume !== 'undefined')
                resolve(data.volume);
            else
                resolve(1);
        });
        xhr.send();
    });
}
window.addEventListener('DOMContentLoaded', () => {
    let socket = socket_io_1.default();
    let app = new vue_1.default({
        el: '#app',
        data: {
            commands: [],
            masterVolume: 1,
            loadingMessage: '',
            albums: [],
            newAlbum: '',
            newTimerDuration: "5 minutes",
            newTimerName: '',
            serverTimers: [],
            buzzer: {
                show: false,
                open: false
            }
        },
        methods: {
            reloadAllClients: function () {
                socket.emit('reload');
            },
            pauseAllMusic: function () {
                socket.emit('pause');
            },
            unpauseAllMusic: function () {
                socket.emit('unpause');
            },
            volumeDown: function () {
                socket.emit('volume-down');
            },
            volumeUp: function () {
                socket.emit('volume-up');
            },
            addAlbum: async function () {
                this.loadingMessage = 'Creating new album...';
                let el = document.querySelector('#album-image');
                if (el && el.files) {
                    let photo = el.files[0];
                    let reader = new FileReader();
                    reader.onload = (e) => {
                        if (e.target) {
                            socket.emit('add-album', { name: app.newAlbum, img: e.target.result });
                        }
                    };
                    reader.readAsDataURL(photo);
                }
            },
            showClockAllClients: function () {
                socket.emit('show-clock');
            },
            startTimer: function () {
                let name = this.newTimerName || this.newTimerDuration + ' minute timer';
                socket.emit('start-timer', name, this.newTimerDuration);
            },
            cancelTimer: function (id) {
                socket.emit('cancel-timer', id);
            },
            getPrettyTimer,
            showBuzzer: function () {
                socket.emit('buzzer-show');
            },
            hideBuzzer: function () {
                socket.emit('buzzer-hide');
            },
            openBuzzer: function () {
                socket.emit('buzzer-open');
            },
            closeBuzzer: function () {
                socket.emit('buzzer-close');
            }
        }
    });
    getMasterVolume().then((volume) => {
        app.masterVolume = volume;
    });
    getAlbums().then((albums) => {
        albums.forEach(album => app.albums.push(album));
    });
    socket.on('play', (data) => {
        app.commands.unshift('play ' + JSON.stringify(data));
    });
    socket.on('new-volume', async () => {
        let volume = await getMasterVolume();
        app.masterVolume = volume;
    });
    socket.on('get-youtube-video', () => {
        app.loadingMessage = 'Done!';
        setTimeout(() => {
            app.loadingMessage = '';
        }, 2000);
    });
    socket.on('add-album', (albumName) => {
        if (albumName == app.newAlbum) {
            app.loadingMessage = '';
            app.newAlbum = '';
            let el = document.querySelector('#album-image');
            if (el) {
                el.value = '';
            }
        }
    });
    socket.on('timer-update', (id, name, secondsLeft) => {
        console.log('timer update');
        let timer = app.serverTimers.filter(t => t.id == id)[0];
        if (!timer) {
            timer = {
                id,
                name,
                secondsLeft
            };
            app.serverTimers.push(timer);
        }
        timer.secondsLeft = secondsLeft;
        timer.name = name;
    });
    socket.on('timer-done', (id, quiet) => {
        let timer = app.serverTimers.filter(t => t.id == id)[0];
        if (timer) {
            app.serverTimers.splice(app.serverTimers.indexOf(timer), 1);
        }
    });
    socket.on('buzzer-show', () => {
        app.buzzer.show = true;
    });
    socket.on('buzzer-hide', () => {
        app.buzzer.show = false;
    });
    socket.on('buzzer-open', () => {
        app.buzzer.open = true;
    });
    socket.on('buzzer-close', () => {
        app.buzzer.open = false;
    });
});
