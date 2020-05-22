# family-media-lan

![Screenshot](https://github.com/michaelfiber/family-media-lan/blob/master/screenshot.png?raw=true)

## Building
`npm run watch` - this will trigger typescript, SASS and cpx to load everything into the dist folder. It also starts nodemon. `parallel` must be installed for that to work. I committed the finished dist folder to the repo so you don't have to do that if you don't want to.

## Running
I run this on Node 12.1.0. 

It can be started by running `node ./dist/server.js`. You can specify the port using `PORT=8080 node ./dist/server.js` or you can also make a .env file in the root directory and then run `node -r dotenv/config ./dist/server.js`.  I run it using [forever](https://www.npmjs.com/package/forever) because I've probably left something broken in it and it will probably need to restart at some point.

## Features
MP3s are served as static files and played in a web browser. WebSockets are used to allow a parent some control over what all the kids' portals are doing. WebRTC is used to let kids do video chat between kids' portals on the LAN which is a fun novelty that my kids get a kick out of at least.

Parents can also play their own separate library of music through this. The parents' portal also has a "kid" button that they can use to set the max volume of, pause/lock, and reload all kids' portals. 

![Parent view](https://github.com/michaelfiber/family-media-lan/blob/master/parent-screenshot.png?raw=true)

Some of my kids' songs were INSANELY loud so you can add a .vol file containing a number between 0.0 and 1.0 that sets song specific volume. It has to have the same name as the song its controlling. The same song *City Run.mp3* has a corresponding *City Run.vol* that sets its volume to 35%. The master volume set from the parent portal is applied on top of this so the final volume of the song is (volume from .vol file || 1.0) * master volume.

There is also a gameshow buzzer mode that turns each kids' portal into a buzzer.  This doesn't have an entry on the parent portal yet but parents can go to /admin and scroll to the bottom.  Click **Show** to display the button on each screen. Click **Open** to allow devices to buzz in. Once someone buzzes in, the buzzer will be closed on all devices until the parent opens it up for buzzing again. The server will decide who presses the buzzer first to avoid arguments.

If the kids portal sits for a while with no activity the screen darkens and a clock is displayed so at least its not completely hideous.

From the admin panel you can set timers that set off an alarm on kids' portals when time runs out. You can see the timer countdown on the kids' portal if the clock is displayed.

## Caveats
I built this really fast because my kids were having trouble with our smart speaker and I NEEDED them to stop fighting. So the code is probably hideous, the design of the pages is built for our devices specifically (low res, low spec android tablets in landscape mode running the kid's portal and Pixel phones in portrait mode running the parent portal.

I built this for an **air-gapped LAN** at my house. I haven't tested this in an environment that is connected to the internet. I didn't do anything special to secure it.

## Adding kid's music
You can place kids music in /path/to/project/family-media-lan/dist/client/albums/(Album Name)/(Song Name.mp3). I didn't build it to gracefully handle characters other than letters, numbers and spaces in album or song names. 

If you put a PNG, GIF or JPG file in an album folder that will be displayed as its album art. The adult player does not display album art. The server picks whatever image it finds first in a folder to use as the album art.

## Adding adult music
You can place adult music in /path/to/project/family-media-lan/dist/client/adult-albums/(Album Name)/(Song Name.mp3)

## Video chat between devices
The kids portal uses PeerJS to allow calling between devices. For a device to show up to other devices it must be named. Go to /parent and click the settings button to set the name of that device. Then when you go back to the kids player at / it will show the device name at the top of the screen and that device will begin showing up for other devices on your network to call it.

WebRTC doesn't like non-HTTPS. If you want to use this feature, set up a self signed server on your LAN to run this and set up your clients to connect to it and trust the certificate. 

## Roadmap
- Add a PIN to the parent portal. My kids are too young to realize they can go there to control it yet so I haven't done this yet.
- Add a friendly UI for adding music and albums. *This is partially done and parts of it might be visible and ugly*.
- Make the UI better. This is built just for the devices displaying it at my house but it wouldn't be hard to make it more responsive.
- Make it talk to other LAN devices like an outside thermometer. 
- Add parent PA system so parents can send a webrtc video call out to all kids' portals for housewide announcements.
- Update the project to use the socket based mDNS alternative for browsers that the rest of my LAN projects use.
- Add timer controls to the parent portal (currently only on /admin). 
- Add synced music across multiple devices - make it so a parent can pick a song and set it playing across any of the devices connected.

## License
Apache License 2.0 sounds fine. I just did this because my kids were driving me insane and I needed to give them something that let me work from home during the pandemic. If it can help you too, that would make me happy. 

## Sample song
Example song "City Run.mp3" was written by Rafael Krux. Description from site: "Epic, dramatic and energetic track made with cinematic drums. Suitable for chasing or suspensful moments. This music is available for commercial and non-commercial purposes." Downloaded from https://freepd.com/scoring.php
