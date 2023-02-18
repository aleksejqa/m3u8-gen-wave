const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const parse = (...args) => import('epg-parser').then(({parse: parse}) => parse(...args));
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const er = require('../public/errors.json');
const pl1 = 'https://tva.in.ua/iptv/s/Sam.ob_2.2021.m3u';
const pl2 = 'https://mater.com.ua/ip/iptv-s-2021.m3u';
const pl3 = 'https://tva.in.ua/iptv/iptv_ukr.m3u';
const urlTvg = 'https://iptvx.one/epg/epg.xml.g';

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

const superTrim = (str) => {
    const a = str.trim().replace(' (720p)', '')
        .replace(' (1080p)', '')
        .replace(' (504p)', '')
        .replace(' (576p)', '')
        .replace(' [Geo-blocked]', '')
        .replace(' (2160p)', '')
        .replace(' [Not 24/7]', '')
        .replace(' (360p)', '')
        .replace(' (480p)', '').toLowerCase();
    return a;
}
module.exports = (async () => {
    const b = M3uParser.parse(await (await fetch(pl1).then(r => r.blob())).text());
    const b2 = M3uParser.parse(await (await fetch(pl2).then(r => r.blob())).text());
    const b3 = M3uParser.parse(await (await fetch(pl3).then(r => r.blob())).text());

    const epg = await parse(fs.readFileSync(path.join(__dirname, '..', '/epg_lite.xml'), {encoding: 'utf-8'}));

    const result = [];

    const medias = [...b.medias, ...b2.medias, ...b3.medias];


    medias.sort((a, d) => a.name < d.name ? -1 : 1).forEach((item) => {
        if (!result.some(a => a.location.trim() === item.location.trim()) && !excluded.some(a => a.trim() === item.location.trim())) {
            result.push({
                ...item,
                name: item.name.trim()
                    .replace(' r', '')
                    .replace(' р', '')
                    .replace(' Р', '')
                    .replace(' (UA)', '')
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
        const ch = epg.channels.find(({name}) => name.some(c => {
            if (typeof c === "string") {
                return c.trim().toLowerCase().indexOf(superTrim(item.name)) !== -1
            } else {
                if (c.value) {
                    return c.value.trim().toLowerCase().indexOf(superTrim(item.name)) !== -1
                } else {
                    return false
                }
            }

        }))
        if (ch) {
            item.attributes["tvg-id"] = ch.id;
            item.attributes["tvg-logo"] = ch.icon[0];
        }


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
                                item.attributes["group-title"] = "УКРАИНА"
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

    res2.sort((a, b) => a.name < b.name ? -1 : 1).forEach((item) => {
        if (!playlist.medias.some(a => a.location.trim() === item.location.trim())) {
            playlist.medias.push(item)
        }
    })

    console.log('all medias ', +medias.length)
    console.log('before clean duplicates: ' + res2.length);
    console.log('end: ' + playlist.medias.length);
    fs.writeFileSync(path.join(__dirname, '..', '/public/errors.json'), JSON.stringify(errors));
    fs.writeFileSync(path.join(__dirname, '..', '/public/west.m3u'), `#EXTM3U url-tvg="${urlTvg}"` + playlist.getM3uString());
})()
