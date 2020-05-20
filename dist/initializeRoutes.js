"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getAlbums_1 = require("./getAlbums");
const volume_1 = require("./volume");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const path_1 = __importDefault(require("path"));
function InitializeRoutes(app) {
    app.use(express_fileupload_1.default({
        createParentPath: true
    }));
    app.post('/song', async (req, res) => {
        let songPath = '';
        if (req.body) {
            songPath = req.body.path;
        }
        let mp3 = null;
        if (req.files) {
            if (req.files.mp3 && !Array.isArray(req.files.mp3))
                mp3 = req.files.mp3;
        }
        if (songPath && mp3) {
            let fullPath = path_1.default.join(__dirname, 'dist', 'client', songPath, mp3.name);
            mp3.mv(fullPath, (err) => {
                if (err) {
                    console.log(err);
                    res.send('error');
                }
                else {
                    res.send('ok');
                }
            });
        }
        else {
            res.send('ok');
        }
    });
    app.get('/albums', async (req, res) => {
        let albums = await getAlbums_1.getAlbums();
        res.json(albums);
    });
    app.get('/volume', async (req, res) => {
        let volume = await volume_1.getVolume();
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
    });
}
exports.InitializeRoutes = InitializeRoutes;
