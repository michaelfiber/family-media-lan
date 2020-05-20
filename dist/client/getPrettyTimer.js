"use strict";
function getPrettyTimer(secondsLeft) {
    let hours = Math.floor(secondsLeft / 3600.0);
    let minutes = Math.floor((secondsLeft - hours * 3600) / 60.0);
    let seconds = secondsLeft - (minutes * 60);
    return `${('00' + hours).substr(-2)}:${('00' + minutes).substr(-2)}:${('00' + seconds).substr(-2)}`;
}
function getAlbums() {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/albums');
        xhr.addEventListener('load', function () {
            let data = JSON.parse(this.response);
            resolve(data);
        });
        xhr.send();
    });
}
function getMasterVolume() {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/volume');
        xhr.addEventListener('load', function () {
            let data = JSON.parse(this.response);
            if (typeof data.volume !== 'undefined')
                resolve(data.volume);
            else
                resolve(1);
        });
        xhr.send();
    });
}
function sleep(timeInMs) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeInMs);
    });
}
// this shit don't work yet
class ChainedAudio {
    constructor() {
        this.isPlaying = false;
        this.steps = [];
        this.currentStep = null;
    }
    play(sound) {
        let newSound = {
            sound: sound,
            durationInSeconds: sound.duration
        };
        this.steps.push(newSound);
        this.currentStep = newSound;
        return this;
    }
    for(durationInSeconds) {
        if (this.currentStep)
            this.currentStep.durationInSeconds = durationInSeconds;
        return this;
    }
    sleep(duration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => { resolve(); }, duration);
        });
    }
    async go() {
        if (this.isPlaying)
            return;
        this.isPlaying = true;
        for (let step of this.steps) {
            await this.stepReady(step);
        }
        for (let step of this.steps) {
            step.sound.currentTime = 0;
            await step.sound.play();
            await this.sleep(step.durationInSeconds * 1000);
            step.sound.pause();
        }
        this.isPlaying = false;
    }
    async stepReady(step) {
        return new Promise((resolve, reject) => {
            if (step.sound.readyState == 4)
                return resolve();
            function tempCallback() {
                step.sound.removeEventListener('canplaythrough', tempCallback);
                resolve();
            }
            step.sound.addEventListener('canplaythrough', tempCallback);
        });
    }
}
