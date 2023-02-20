const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const er = require('../public/errors.json');

const pList = [
    'https://tva.in.ua/iptv/s/Sam.ob_2.2021.m3u',
    'https://tva.in.ua/iptv/iptv_ukr.m3u',
    // 'https://cutt.ly/D3Bc4PO',
    'https://gavrilovka.net/pl/AnonymousTV.m3u',
    'https://gavrilovka.net/pl/FPS.m3u'
]

const playlist = new M3uPlaylist();
playlist.title = 'West playlist';

module.exports = (async () => {
    const sorted = {};
    const medias = [];


    for (const p of pList) {
        const {medias: m} = M3uParser.parse(await (await fetch(p).then(r => r.blob())).text())
        medias.push(...m)
    }

    for (const item of medias) {

        const url = item.location.match(/(https|http):\/\/(.+?)\//)?.[0] || 'other';
        if (!sorted[url]) {
            sorted[url] = []
        }

        if(!sorted[url].some(a => a === item.location.trim())){
            sorted[url].push(item.location.trim())
        }

    }

    fs.writeFileSync(path.join(__dirname, '..', '/public/sorted.json'), JSON.stringify(sorted));
})()
