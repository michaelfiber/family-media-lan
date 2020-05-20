var exports = {};

function require(pkg) {
    switch (pkg) {
        case 'vue':
            return Vue;
            break;
        case 'socket.io':
            return io;
            break;
        case 'peerjs':
            return Peer;
            break;
    }
}

if (!document.documentElement.requestFullscreen) document.documentElement.requestFullscreen = document.documentElement.webkitRequestFullscreen || document.documentElement.mozRequestFullScreen || document.documentElement.msRequestFullscreen