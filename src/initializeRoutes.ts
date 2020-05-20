import express, { response } from 'express';
import { getAlbums } from './getAlbums';
import { getVolume } from './volume';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';

export function InitializeRoutes(app: express.Application) {

    app.use(fileUpload({
        createParentPath: true
    }));

    app.post('/song', async (req, res) => {
        let songPath = '';
        if (req.body) {
            songPath = req.body.path;
        }
        let mp3 = null as null | UploadedFile;
        if (req.files) {
            if (req.files.mp3 && !Array.isArray(req.files.mp3)) mp3 = req.files.mp3;
        }

        if (songPath && mp3) {
            let fullPath = path.join(__dirname, 'dist', 'client', songPath, mp3.name);
            mp3.mv(fullPath, (err) => {
                if (err) {
                    console.log(err);
                    res.send('error');
                } else {
                    res.send('ok');
                }
            })
        } else {
            res.send('ok');
        }
    });

    app.get('/albums', async (req, res) => {
        let albums = await getAlbums();
        res.json(albums);
    });

    app.get('/volume', async (req, res) => {
        let volume = await getVolume();
        res.json({
            volume
        });
    });

    app.get('/', async (req, res) => {
        res.render('index');
    });

    app.get('/admin', async (req, res) => {
        res.render('admin');
    });

    app.get('/parent', (req, res) => {
        res.render('parent');
    })


}