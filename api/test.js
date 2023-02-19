const path = require('path');
const fs = require('fs');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const KEY = '3539CF125E33231'

const EPG = 'https://ip-tv.dev/epg/epg.xml.gz';
const epgStr = `#EXTM3U url-tvg="${EPG}"`;

module.exports = (async () => {

    const url = `https://iptv.online/play/${KEY}/m3u`

    const playlist = await (await fetch(url).then(r => r.blob())).text()


    const s = playlist.replace('#EXTM3U', epgStr);


    fs.writeFileSync(path.join(__dirname, '..', '/public/test.m3u'), s);

})()
