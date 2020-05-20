interface Song {
    name: string;
    path: string;
    coverUrl?: string;
}

interface Album {
    name: string;
    coverUrl: string;
    songs: Array<Song>;
    volumes: {
        [key: string]: number;
    }
}

interface PlayParams {
    songName: string;
    albumName: string;
}

//declare function getPrettyTimer(secondsLeft: number): string;

interface OpenWeatherMapResponse {
    coord: {
        lon: number;
        lat: number;
    }
    weather: Array<{
        id: number;
        main: string;
        description: string;
        icon: string;
    }>
    base: string;
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    visibility: number;
    wind: {
        speed: number;
        deg: number;
    }
    clouds: {
        all: number;
    }
    dt: number;
    sys: {
        type: number;
        id: number;
        country: string;
        sunrise: number;
        sunset: number;
    }
    timezone: number;
    id: number;
    name: string;
    cod: number;
}