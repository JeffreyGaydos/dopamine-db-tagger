import http from 'node:http';
import { GetMimeTypeFromURI } from './utilities.js';
import { GetAudioResource } from './audio-server.js';
import { GetWebResource } from './web-server.js';
import { GetApiResource } from './api-server.js';
import fs from 'node:fs';

// const hostname = '0.0.0.0';
const hostname = '127.0.0.1';
const port = 8080;

const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (dc) => {
        body += dc;
    });
    req.on("end", () => {
        const mimeType = GetMimeTypeFromURI(req.url);
        if(req.url.includes("/api/")) {
            GetApiResource(req.url, mimeType, res, body);
        }
        else if (mimeType.includes("audio/")) {
            GetAudioResource(req.url, mimeType, res, body);
        }
        else if(req.url == "/favicon.ico/") {
            fs.readFile("./tags.ico", function(_, data) {
                res.end(data);
            });
        } else {
            GetWebResource(req.url, mimeType, res, body);
        }
    });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});