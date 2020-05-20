"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function readDir(path) {
    return new Promise((resolve, reject) => [
        fs_1.default.readdir(path, (err, files) => {
            if (err)
                reject(err);
            else
                resolve(files);
        })
    ]);
}
async function readFile(path) {
    return new Promise((resolve, reject) => [
        fs_1.default.readFile(path, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data.toString());
        })
    ]);
}
async function isDirectory(path) {
    return new Promise((resolve, reject) => {
        fs_1.default.lstat(path, (err, stats) => {
            if (err)
                reject(err);
            else
                resolve(stats.isDirectory());
        });
    });
}
async function exists(path) {
    return new Promise((resolve, reject) => {
        fs_1.default.exists(path, (exists) => {
            resolve(exists);
        });
    });
}
async function mkDir(path) {
    return new Promise((resolve, reject) => {
        fs_1.default.mkdir(path, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
async function writeFile(path, data, type) {
    return new Promise((resolve, reject) => {
        fs_1.default.writeFile(path, data, { encoding: 'base64' }, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
let imgRegex = /\.(png|jpg|gif)$/ig;
let audioRegex = /\.(mp3|wav)$/ig;
async function getAlbums(albumPath = 'albums') {
    let basePath = path_1.default.join(__dirname, 'client', albumPath);
    let albums = [];
    let albumFolders = await readDir(basePath);
    for (let folder of albumFolders) {
        let newAlbum = {
            name: folder,
            coverUrl: '',
            songs: [],
            volumes: {}
        };
        let albumFiles = await readDir(path_1.default.join(basePath, folder));
        for (let albumFile of albumFiles) {
            if (albumFile.match(imgRegex))
                newAlbum.coverUrl = '/' + albumPath + '/' + encodeURIComponent(folder) + '/' + albumFile;
            if (albumFile.endsWith('.vol')) {
                let volume = await readFile(path_1.default.join(basePath, folder, albumFile));
                newAlbum.volumes[albumFile.substr(0, albumFile.length - 4)] = parseFloat(volume);
            }
        }
        for (let albumFile of albumFiles) {
            if (albumFile.match(audioRegex))
                newAlbum.songs.push({
                    name: albumFile.replace(audioRegex, ''),
                    path: '/' + albumPath + '/' + encodeURIComponent(folder) + '/' + albumFile,
                    coverUrl: newAlbum.coverUrl
                });
            else {
                let filesystemAlbumPath = path_1.default.join(basePath, folder, albumFile);
                let isDir = await isDirectory(filesystemAlbumPath);
                if (isDir) {
                    let subFiles = await readDir(filesystemAlbumPath);
                    for (let subFile of subFiles) {
                        if (subFile.endsWith('.mp3'))
                            newAlbum.songs.push({
                                name: albumFile,
                                path: '/' + albumPath + '/' + encodeURIComponent(folder) + '/' + albumFile + '/' + subFile,
                                coverUrl: newAlbum.coverUrl
                            });
                    }
                }
            }
        }
        albums.push(newAlbum);
    }
    return albums;
}
exports.getAlbums = getAlbums;
async function addAlbum(name, imgData, albumPath) {
    if (!albumPath)
        albumPath = 'albums';
    let newAlbumPath = path_1.default.join(__dirname, 'client', albumPath, name);
    let alreadyExists = await exists(newAlbumPath);
    if (!alreadyExists) {
        await mkDir(newAlbumPath);
    }
    if (imgData && !alreadyExists) {
        let imgHeader = imgData.substr(0, 100).split(',')[0];
        let type = 'jpg';
        if (imgHeader.indexOf('png') > -1)
            type = 'png';
        let strippedData = imgData.replace(imgHeader, '');
        await writeFile(path_1.default.join(newAlbumPath, name + '.' + type), strippedData, 'base64');
    }
}
exports.addAlbum = addAlbum;
