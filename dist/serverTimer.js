"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class ServerTimer extends events_1.EventEmitter {
    constructor(id, name, duration) {
        super();
        this.id = id;
        this.name = name;
        this.duration = duration;
        this.seconds = duration * 60;
        this.secondsLeft = this.seconds;
        this.updateInterval = setInterval(this.update.bind(this), 1000);
    }
    update() {
        this.secondsLeft--;
        if (this.secondsLeft < 0) {
            this.emit('done', this.id);
            this.stop();
        }
        else {
            this.emit('update', this.id, this.name, this.secondsLeft);
        }
    }
    stop() {
        console.log('timer stop');
        clearInterval(this.updateInterval);
    }
    cancel() {
        console.log('timer cancel');
        this.emit('done', this.id, true);
        this.stop();
    }
}
exports.ServerTimer = ServerTimer;
