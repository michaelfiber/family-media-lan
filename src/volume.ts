import fs from 'fs';
import path from 'path';

let volume = 1.0;

let volumePath = path.join(__dirname, 'data', 'master-volume.dat');

console.log('getting master volume');
fs.readFile(volumePath, (err, data) => {
    if (err) console.log(err);
    else console.log(data.toString());
})

export function getVolume(): Promise<number> {
    return new Promise((resolve, reject) => {
        fs.readFile(volumePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                let result = parseFloat(data.toString());
                if (isNaN(result)) {
                    setVolume(1).then(() => resolve(1));
                } else {
                    resolve(result);
                }
            }
        })
    });
}

export function setVolume(newVolume: number): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.writeFile(volumePath, newVolume.toFixed(4), (err) => {
            if (err) reject(err);
            else resolve();
        })
    });
}