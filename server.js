import Install from './install.js'
import Uninstall from './uninstall.js';
import http from 'node:http';
import { GetMimeTypeFromURI } from './utilities.js';
import { GetAudioResource } from './audio-server.js';
import { GetWebResource } from './web-server.js';
import { GetApiResource } from './api-server.js';

const hostname = '127.0.0.1';
const port = 8080;

const server = http.createServer((req, res) => {
    const mimeType = GetMimeTypeFromURI(req.url);
    if(req.url.includes("/api/")) {
        GetApiResource(req.url, mimeType, res);
    }
    else if (mimeType.includes("audio/")) {
        GetAudioResource(req.url, mimeType, res);
    } else {
        GetWebResource(req.url, mimeType, res);
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

(async () => {
    // await Install();
})();