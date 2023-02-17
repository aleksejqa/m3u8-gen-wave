const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const fs = require('fs');
const er = require('../public/errors.json');
const pl1 = 'https://tva.in.ua/iptv/s/Sam.ob_2.2021.m3u';
const pl2 = 'https://mater.com.ua/ip/iptv-s-2021.m3u';
const pl3 = 'https://tva.in.ua/iptv/iptv_ukr.m3u';
const playlist = new M3uPlaylist();
playlist.title = 'West playlist';

const excluded = [
    'https://bal.varcdn.top',
    'http://194.242.100.24:6666',
    'http://cdn.adultiptv.net',
    ...er["500"], ...er["400"], ...er["300"]
]

const errors = {
    300: er["300"],
    400: er["400"],
    500: er["500"],
}

module.exports = (async () => {

    const b = M3uParser.parse(await (await fetch(pl1).then(r => r.blob())).text());
    const b2 = M3uParser.parse(await (await fetch(pl2).then(r => r.blob())).text());
    const b3 = M3uParser.parse(await (await fetch(pl3).then(r => r.blob())).text());

    const result = [];

    const medias = [...b.medias, ...b2.medias, ...b3.medias]
        .filter((item) => item.location.indexOf('.mp4') === -1)
        .filter((item) => item.location.indexOf('.ru:') === -1)
        .filter((item) => item.location.indexOf('.ru/') === -1);

    medias.forEach((item) => {
        if (!result.some(a => a.location.trim() === item.location.trim()) && !excluded.some(a => a.trim() === item.location.trim())) {
            result.push({
                ...item,
                name: item.name.trim()
                    .replace(' r', '')
                    .replace(' HD', '')
                    .replace(' (UA)', '')
                    .replace(' (720p)', '')
                    .replace(' tva.org.ua', '')
                    .replace(' tva.in.ua', ''),
                location: item.location.trim()
            })
        }
    })

    const res2 = [];

    for (const item of result) {
        try {
            const res = (await fetch(item.location));
            const {status} = res

            if (status > 499) {
                errors["500"].push(item.location)
            } else if (status > 399) {
                errors["400"].push(item.location)
            } else {
                if (!res.headers.get('content-length')) {
                    res2.push(item);
                } else {
                    let r = await res.blob();
                    if (r.size === 0) {
                        errors["300"].push(item.location);
                    } else {
                        if (!excluded.some((a) => res.url.indexOf(a) !== -1)) {
                            if (!item.attributes["group-title"]) {
                                item.attributes["group-title"] = "УКРАИНА"
                            }
                            if (res.redirected) {
                                item.location = res.url
                            }
                            res2.push(item);
                        }
                    }
                }
            }
        } catch (e) {
            if (e.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
                errors["500"].push(item.location)
            } else {
                errors["500"].push(item.location)
            }
        }
    }

    res2.sort((a, b) => a.name < b.name ? -1 : 1).forEach((item) => {
        if (!playlist.medias.some(a => a.location.trim() === item.location.trim())) {
            playlist.medias.push(item)
        }
    })

    fs.writeFileSync(path.join(__dirname, '..', '/public/errors.json'), JSON.stringify(errors));
    fs.writeFileSync(path.join(__dirname, '..', '/public/west.m3u'), `#EXTM3U url-tvg="http://iptvx.one/epg/epg.xml.gz"` + playlist.getM3uString());
    console.log('end: ' + playlist.medias.length)
})()
