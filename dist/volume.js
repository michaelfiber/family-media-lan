"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let volume = 1.0;
let volumePath = path_1.default.join(__dirname, 'data', 'master-volume.dat');
console.log('getting master volume');
fs_1.default.readFile(volumePath, (err, data) => {
    if (err)
        console.log(err);
    else
        console.log(data.toString());
});
function getVolume() {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(volumePath, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                let result = parseFloat(data.toString());
                if (isNaN(result)) {
                    setVolume(1).then(() => resolve(1));
                }
                else {
                    resolve(result);
                }
            }
        });
    });
}
exports.getVolume = getVolume;
function setVolume(newVolume) {
    return new Promise((resolve, reject) => {
        fs_1.default.writeFile(volumePath, newVolume.toFixed(4), (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.setVolume = setVolume;
