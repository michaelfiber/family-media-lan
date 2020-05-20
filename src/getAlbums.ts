import fs from 'fs';
import path from 'path';

interface Song {
    name: string;
    coverUrl?: string;
    path: string;
}

interface Album {
    name: string;
    coverUrl: string;
    songs: Array<Song>;
    volumes: {
        [key: string]: number
    };
}

async function readDir(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => [
        fs.readdir(path, (err, files) => {
            if (err) reject(err);
            else resolve(files);
        })
    ]);
}

async function readFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => [
        fs.readFile(path, (err, data) => {
            if (err) reject(err);
            else resolve(data.toString());
        })
    ])
}

async function isDirectory(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stats) => {
            if (err) reject(err);
            else resolve(stats.isDirectory());
        });
    });
}

async function exists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {

        fs.exists(path, (exists) => {
            resolve(exists);
        });

    })
}

async function mkDir(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, (err) => {
            if (err) reject(err);
            else resolve();
        })
    })
}

async function writeFile(path: string, data: string, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, { encoding: 'base64' }, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

let imgRegex = /\.(png|jpg|gif)$/ig;
let audioRegex = /\.(mp3|wav)$/ig;

export async function getAlbums(albumPath: string = 'albums') {

    let basePath = path.join(__dirname, 'client', albumPath);

    let albums: Array<Album> = [];

    let albumFolders = await readDir(basePath);

    for (let folder of albumFolders) {
        let newAlbum: Album = {
            name: folder,
            coverUrl: '',
            songs: [],
            volumes: {}
        }

        let albumFiles = await readDir(path.join(basePath, folder));

        for (let albumFile of albumFiles) {
            if (albumFile.match(imgRegex)) newAlbum.coverUrl = '/' + albumPath + '/' + encodeURIComponent(folder) + '/' + albumFile
            if (albumFile.endsWith('.vol')) {
                let volume = await readFile(path.join(basePath, folder, albumFile));
                newAlbum.volumes[albumFile.substr(0, albumFile.length - 4)] = parseFloat(volume);
            }
        }

        for (let albumFile of albumFiles) {


            if (albumFile.match(audioRegex)) newAlbum.songs.push({
                name: albumFile.replace(audioRegex, ''),
                path: '/' + albumPath + '/' + encodeURIComponent(folder) + '/' + albumFile,
                coverUrl: newAlbum.coverUrl
            });
            else {
                let filesystemAlbumPath = path.join(basePath, folder, albumFile);

                let isDir = await isDirectory(filesystemAlbumPath);
                if (isDir) {
                    let subFiles = await readDir(filesystemAlbumPath);
                    for (let subFile of subFiles) {
                        if (subFile.endsWith('.mp3')) newAlbum.songs.push({
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

export async function addAlbum(name: string, imgData?: string, albumPath?: string) {
    if (!albumPath) albumPath = 'albums';

    let newAlbumPath = path.join(__dirname, 'client', albumPath, name);
    let alreadyExists = await exists(newAlbumPath);

    if (!alreadyExists) {
        await mkDir(newAlbumPath);
    }

    if (imgData && !alreadyExists) {
        let imgHeader = imgData.substr(0, 100).split(',')[0];
        let type = 'jpg';
        if (imgHeader.indexOf('png') > -1) type = 'png';
        let strippedData = imgData.replace(imgHeader, '');
        await writeFile(path.join(newAlbumPath, name + '.' + type), strippedData, 'base64');
    }
}