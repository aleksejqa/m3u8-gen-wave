const {M3uPlaylist} = require("m3u-parser-generator");
const path = require('path');
const fs = require('fs');
const source = require('../public/source.json');

const playlist = new M3uPlaylist();
playlist.title = 'West playlist';

module.exports = (async () => {
    source.sort((a, b) => a.name < b.name ? -1 : 1).forEach(a => playlist.medias.push(a))
    console.log(source.length);
    fs.writeFileSync(path.join(__dirname, '..', '/public/manual.m3u'), playlist.getM3uString());
})()
