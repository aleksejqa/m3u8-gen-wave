const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const er = require('../public/errors.json');

const pList = [
    'https://tva.in.ua/iptv/s/Sam.ob_2.2021.m3u',
    'http://gavrilovka.org/_ld/3/387_TV.m3u',
    'https://tva.in.ua/iptv/iptv_ukr.m3u',
    'https://gavrilovka.net/pl/AnonymousTV.m3u',
    'https://gavrilovka.net/pl/FPS.m3u'
]
const urlTvg = 'https://iptvx.one/epg/epg.xml.gz';

const playlist = new M3uPlaylist();
playlist.title = 'West playlist';

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const excluded = [
    'https://bal.varcdn.top',
    'http://194.242.100.24:6666',
    'http://cdn.adultiptv.net',
    ...er["500"], ...er["400"], ...er["300"], ...er["600"]
]

const errors = {
    300: er["300"],
    400: er["400"],
    500: er["500"],
    600: er["600"],
}

async function fetchWithTimeout(resource, options = {}) {
    const {timeout = 7000} = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

module.exports = (async () => {
    const medias = [];

    for (const p of pList) {
        const {medias: m} = M3uParser.parse(await (await fetch(p).then(r => r.blob())).text())
        medias.push(...m)
    }

    const result = [];

    medias.sort((a, d) => a.name < d.name ? -1 : 1).forEach((item) => {
        if (!result.some(a => a.location.trim() === item.location.trim()) && !excluded.some(a => a.trim() === item.location.trim())) {
            result.push({
                ...item,
                name: item.name.trim()
                    .replace(' tva.org.ua', '')
                    .replace(' iptv.org.ua', '')
                    .replace(' tva.in.ua', ''),
                location: item.location.trim()
            })
        }
    })

    bar1.start(result.length, 0);


    const res2 = [];

    for (const item of result) {
        try {
            const res = (await fetchWithTimeout(item.location));
            const {status} = res

            if (status > 499) {
                errors["500"].push(item.location)
            } else if (status > 399) {
                errors["400"].push(item.location)
            } else {
                if (!res.headers.get('content-length')) {
                    res2.push(item);
                } else {
                    let r = item.location.endsWith('.mp4') ? {size: 1} : await res.blob();
                    if (r.size === 0) {
                        errors["300"].push(item.location);
                    } else {
                        if (!excluded.some((a) => res.url.indexOf(a) !== -1)) {
                            if (!item.attributes["group-title"]) {
                                item.attributes["group-title"] = "other"
                            }
                            res2.push(item);
                        }
                    }
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                errors["600"].push(item.location)
            } else if (e.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
                errors["600"].push(item.location)
            } else {
                errors["500"].push(item.location)
            }
        }
        bar1.increment();
    }

    bar1.stop();

    playlist.medias = res2;

    console.log('all medias: ' + medias.length);
    console.log('after clean duplicates: ' + result.length);
    console.log('end: ' + playlist.medias.length);
    fs.writeFileSync(path.join(__dirname, '..', '/public/errors.json'), JSON.stringify(errors));
    fs.writeFileSync(path.join(__dirname, '..', '/public/west.m3u'), `#EXTM3U url-tvg="${urlTvg}"` + playlist.getM3uString());
})()
