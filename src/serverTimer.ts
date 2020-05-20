import { EventEmitter } from 'events';

export declare interface ServerTimer extends EventEmitter {
    on(event: 'update', listener: (id: string, name: string, secondsLeft: number) => void): this;
    on(event: 'done', listener: (id: string, quiet?: boolean) => void): this;
}

export class ServerTimer extends EventEmitter {
    private seconds: number;
    public secondsLeft: number;
    private updateInterval: NodeJS.Timeout;

    constructor(public id: string, public name: string, public duration: number) {
        super();    

        this.seconds = duration * 60;
        this.secondsLeft = this.seconds;
        this.updateInterval = setInterval(this.update.bind(this), 1000);
    }

    update() {
        this.secondsLeft--;
        if (this.secondsLeft < 0) {
            this.emit('done', this.id);
            this.stop();
        } else {
            this.emit('update', this.id, this.name, this.secondsLeft);
        }
    }

    private stop() {
        console.log('timer stop');
        clearInterval(this.updateInterval);
    }

    cancel() {
        console.log('timer cancel');
        this.emit('done', this.id, true);
        this.stop();
    }
}
