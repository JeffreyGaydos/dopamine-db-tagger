import Install from './install.js'
import Uninstall from './uninstall.js';
import http from 'node:http';
import fs from 'node:fs';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  fs.readFile('./' + req.url, function(err, data) {
        if (!err) {
            var dotoffset = req.url.lastIndexOf('.');
            var mimetype = dotoffset == -1
                            ? 'text/plain'
                            : {
                                '.html' : 'text/html',
                                '.ico' : 'image/x-icon',
                                '.jpg' : 'image/jpeg',
                                '.png' : 'image/png',
                                '.gif' : 'image/gif',
                                '.css' : 'text/css',
                                '.js' : 'text/javascript',
                                '.json' :  'text/javascript'
                                }[ req.url.substr(dotoffset) ];
            mimetype = mimetype ?? 'text/plain';
            res.setHeader('Content-type' , mimetype);
            res.end(data);
            console.log( req.url, mimetype);
        } else {
            console.log ('file not found: ' + req.url);
            res.writeHead(404, "Not Found");
            res.end();
        }
    });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

(async () => {
    
})();