import Install from './install.js'
import Uninstall from './uninstall.js';
import http from 'node:http';
import fs from 'node:fs';
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { BasicGetFile, GetConfigJSONCached, GetMimeTypeFromURI } from './utilities.js';
import { chdir, cwd } from 'node:process';
import { GetAudioResource } from './audio-server.js';
import { GetWebResource } from './web-server.js';

const hostname = '127.0.0.1';
const port = 8080;

const server = http.createServer((req, res) => {
    const mimeType = GetMimeTypeFromURI(req.url);
    if(mimeType.includes("audio/")) {
        GetAudioResource(req.url, mimeType, res);
    } else {
        GetWebResource(req.url, mimeType, res);
//   fs.readFile('./' + req.url, function(err, data) {
//     routeEndpoints(req.url).then(apiData => {
//         if (!err || apiData) {
//             var dotoffset = req.url.lastIndexOf('.');
//             var mimetype = dotoffset == -1
//                             ? 'text/plain'
//                             : {
//                                 '.html' : 'text/html',
//                                 '.ico' : 'image/x-icon',
//                                 '.jpg' : 'image/jpeg',
//                                 '.png' : 'image/png',
//                                 '.gif' : 'image/gif',
//                                 '.css' : 'text/css',
//                                 '.js' : 'text/javascript',
//                                 '.json' :  'text/javascript',
//                                 '.mp3' : 'audio/mpeg',
//                                 '.ogg' : 'audio/ogg',
//                                 '.wav' : 'audio/wav',
//                                 '.aac' : 'audio/aac',
//                                 '.webm' : 'audio/webm',
//                                 '.flac' : 'audio/flac'
//                                 }[ req.url.substr(dotoffset) ];
//             mimetype = mimetype ?? 'text/plain';
//             mimetype = !!apiData ? 'text/html' : mimetype;
//             res.setHeader('Content-type' , mimetype);
//             if(data) {
//                 // console.log("Size: " + data.byteLength + 1 + " | " + mimetype);
//                 res.setHeader('Content-length', data.byteLength + 1);
//             }
//             if(mimetype.includes("audio")) {
                
//             } else {
//                 data ??= "";
//                 data += apiData;
//                 if(mimetype === 'text/html') { //micro-react situation
//                     data = String(data).replaceAll('<C src="', '<iframe src="');
//                     data = data.replaceAll('"></C>', '" onload="(() => { try { TrackIframeLoad(); } catch {} })()"></iframe>');
//                     if(!req.url?.includes("/home.html")) {
//                         data = "<div component>" + data + "</div>";
//                     } else {
//                         data = data + '<script src="component-backend.js"></script>';
//                     }
//                 }
//             }
//             res.end(data);
//             // console.log( req.url, mimetype);
//         } else {
//             // console.log ('file not found: ' + req.url);
//             res.writeHead(404, "Not Found");
//             res.end();
//         }
//     });
//   });
}
});

async function routeEndpoints(url) {
    const config = await GetConfigJSONCached();

    const db = await open({
        filename: config.DatabaseLocation,
        driver: sqlite3.Database
    });

    if(url == "/ui/landing.html") {
        console.log("Querying...");
        const result = await db.all(`
            SELECT DISTINCT
                coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw,
                coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName) AS TitleRaw,
                TrackID
            FROM Track
            ORDER BY
                coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists),
                coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName)
        `);
        /**
         * [
         *      {
         *          "ArtistsRaw": "Adam Skorupa & Krzysztof Wiezynkiewicz"
         *          "Tracks": [
         *              {
         *                  "TrackID": 1,
         *                  "TitleRaw": "The scent of battle"
         *              },
         *              {
         *                  "TrackID": 2,
         *                  "TitleRaw": "The sewers"
         *              }
         *          ]
         *      }
         * ]
         */
        const groupedArtists = [];
        result.forEach(r => {
            const safeArtist = r.ArtistsRaw == "" ? "Unknown Artist" : r.ArtistsRaw;
            if(groupedArtists.filter(g => g.ArtistsRaw === safeArtist).length === 0) {
                groupedArtists.push({
                    ArtistsRaw: safeArtist,
                    Tracks: []
                });
            }

            groupedArtists.filter(g => g.ArtistsRaw === safeArtist)[0].Tracks.push({
                TrackID: r.TrackID,
                TitleRaw: r.TitleRaw
            });
        });

        return `<div id="response" style="display: none">${JSON.stringify(groupedArtists)}</div>`;
    }
    if(url.match(/\/ui\/tagging\/[1-9]+[0-9]*/)) {
        const trackString = url.match(/(?<=\/ui\/tagging\/)[1-9]+[0-9]*/)[0];
        let baseHtml = await BasicGetFile('./ui/tagging.html');
        console.log("Querying...");
        const result = await db.all(`
             SELECT * FROM Track WHERE TrackID = $t
        `, { $t: trackString });

        let actualPath = result[0].Path;
        actualPath = actualPath.replaceAll(/\s/g, "%20");
        actualPath = actualPath.replaceAll(/F:[\/\\]Music[\/\\]/g, "");
        actualPath = "../../" + actualPath;
        baseHtml = baseHtml.replace("$$$PATH$$$", actualPath);

        return `${baseHtml}<div id="response" style="display: none">${JSON.stringify(result)}</div>`;
    }
}

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

(async () => {
    // await Install();
})();