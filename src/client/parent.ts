///<reference path="../../socket-actions.d.ts" />
import Vue from 'vue';
import io from 'socket.io';

interface PlayerAlbum extends Album {
    songs: Array<PlayerSong>;
}

interface PlayerSong extends Song {
    inPlaylist?: boolean;
}

window.addEventListener('DOMContentLoaded', () => {
    let clientName = localStorage.getItem('settings.clientName');

    let socket = io();

    let clockTimeout: NodeJS.Timeout;
    let clockTimeoutAmount = 15 * 60 * 1000;

    let app = new Vue({
        el: '#app',
        data: {
            showClock: false,
            tab: 'client-settings',
            isSettingsModalVisible: false,
            music: {
                isAddSongModalVisible: false,
                isAddAlbumModalVisible: false,
                newAlbumName: '',
                newSongName: '',
                uploading: false,
                currentAlbum: '',
                albums: [] as Array<PlayerAlbum>,
                currentSong: null as null | Song,
                audio: null as null | HTMLAudioElement,
                paused: false,
                currentTime: 0,
                currentLength: 0
            },
            settings: {
                clientName: clientName || ''
            },
            notifications: [] as Array<string>,
            children: {
                isChildSettingsVisible: false,
                masterVolume: 1
            }
        },
        methods: {
            reloadAllClients: function () {
                socket.emit('reload');                
            },
            updateClockTimeout: function () {
                if (clockTimeout) clearTimeout(clockTimeout);
                clockTimeout = setTimeout(() => {
                    this.showClock = true;
                }, clockTimeoutAmount);
            },
            submitClientName: function () {
                localStorage.setItem('settings.clientName', this.settings.clientName);
                socket.emit('client-name', this.settings.clientName);
            },
            saveNewAlbum: function () {
                socket.emit('parent-new-album', this.music.newAlbumName);
                this.music.newAlbumName = '';
                this.music.isAddAlbumModalVisible = false;
            },
            uploadNewSong: async function () {
                if (!this.music.uploading) {
                    this.music.uploading = true;

                    console.log('uploadNewSong');
                    let file = document.querySelector<HTMLInputElement>('#new-song');
                    if (file && file.files) {
                        let formData = new FormData();
                        formData.append('album', this.music.currentAlbum)
                        formData.append('path', 'adult-albums');
                        formData.append('mp3', file.files[0]);
                        let result = await fetch('/song', { method: 'POST', body: formData });
                        console.log(result);
                    }

                    this.music.uploading = false;
                    this.music.newSongName = '';
                    if (file) file.value = '';
                    this.music.isAddSongModalVisible = false;

                    // request song lost?
                }
            },
            playSong: function (song: Song) {
                if (this.music.audio) {
                    this.music.audio.pause();
                    this.music.audio = null;
                }
                this.music.currentSong = song;
                this.music.audio = new Audio(this.music.currentSong.path);
                this.music.audio.play();
                this.music.paused = false;
            },
            pauseSong: function () {
                if (this.music.audio) {
                    this.music.audio.pause();
                    this.music.paused = true;
                }
            },
            unpauseSong: function () {
                if (this.music.audio && this.music.paused) {
                    this.music.audio.play();
                    this.music.paused = false;
                }
            },
            stopSong: function () {
                if (this.music.audio) {
                    this.music.audio.pause();
                    this.music.audio = null;
                    this.music.currentSong = null;
                }
            },
            nextSong: function () {
                if (this.music.currentSong) {
                    let songFound = false;
                    for (let album of this.music.albums) {
                        for (let song of album.songs.filter(s => s.inPlaylist)) {
                            if (songFound) return this.playSong(song);
                            if (song.path == this.music.currentSong.path) songFound = true;
                        }
                    }
                }
                this.stopSong();
            },
            previousSong: function () {
                if (this.music.currentSong) {
                    let previous = null as null | PlayerSong;

                    for (let album of this.music.albums) {
                        for (let song of album.songs) {
                            if (song.path == this.music.currentSong.path) {
                                if (previous) return this.playSong(previous);
                                else return this.stopSong();
                            }
                            if (song.inPlaylist) previous = song;
                        }
                    }

                    this.stopSong();
                }                
            },
            addSongToPlaylist: function (song: PlayerSong) {
                song.inPlaylist = true;
                localStorage.setItem('playlist-' + song.path, '1');
            },
            removeSongFromPlaylist: function (song: PlayerSong) {
                song.inPlaylist = false;
                localStorage.setItem('playlist-' + song.path, '0');
            },
            getMasterVolume: function (): Promise<number> {
                return new Promise((resolve, reject) => {
                    console.log('get new volume');
                    let xhr = new XMLHttpRequest();
                    xhr.open('GET', '/volume');
                    xhr.addEventListener('load', function () {
                        console.log('volume response', this.response);
                        let data = JSON.parse(this.response);
                        console.log(JSON.stringify(data, null, 2));
                        if (typeof data.volume !== 'undefined') resolve(data.volume);
                        else resolve(1);
                    });
                    xhr.send();
                });
            },
            volumeDown: function () {
                socket.emit('volume-down');
            },
            volumeUp: function () {
                socket.emit('volume-up');
            },
            pauseChildren: function () {
                socket.emit('pause');
            },
            unpauseChildren: function () {
                socket.emit('unpause');
            },            
        }
    })

    let consecutiveEndOfSongs = 0;
    setInterval(() => {
        if (app.music.audio) {
            app.music.currentTime = app.music.audio.currentTime;
            app.music.currentLength = app.music.audio.duration;
            if (Math.abs(app.music.currentTime - app.music.currentLength) < 0.01) consecutiveEndOfSongs++;
            if (consecutiveEndOfSongs > 5) {
                consecutiveEndOfSongs = 0;
                app.nextSong();
            }
        } else {
            app.music.currentTime = 0;
            app.music.currentLength = 0;
        }
    }, 250);

    app.updateClockTimeout();
    socket.emit('client-name', app.settings.clientName);

    socket.on('parent-new-album', (newAlbumName: string) => {
        app.notifications.unshift('Album ' + newAlbumName + ' has been created');
    });

    socket.on('parent-get-albums', (albums: Array<PlayerAlbum>) => {

        albums.forEach(album => {
            album.songs.forEach(song => {
                let preference = localStorage.getItem('playlist-' + song.path);
                if (preference) {
                    song.inPlaylist = preference == '1';
                } else {
                    song.inPlaylist = true
                }
            })
        });

        console.log('parent-get-albums');
        app.music.albums.splice(0, app.music.albums.length, ...albums);
    });

    socket.on('new-volume', async () => {
        let volume = await app.getMasterVolume();
        app.children.masterVolume = volume;
    });

    socket.emit('parent-get-albums');
});