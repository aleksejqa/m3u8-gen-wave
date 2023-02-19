const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const pl3 = 'https://tva.in.ua/iptv/iptv_ukr.m3u';
const urlTvg = 'https://iptvx.one/epg/epg.xml.gz';

const playlist = new M3uPlaylist();
playlist.title = 'West playlist UA';

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const excluded = [
    'https://iptv.org.ua/wp-content/uploads/2022/01/Moyo-slayd33-shou.mp4',
    'https://bal.varcdn.top',
    'http://194.242.100.24:6666',
    'http://cdn.adultiptv.net'
]

const errors = []

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
    const b3 = M3uParser.parse(await (await fetch(pl3).then(r => r.blob())).text());

    const result = [];
    console.log(b3);

    const medias = b3.medias;


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
        try {
            const res = (await fetchWithTimeout(item.location));
            const {status} = res

            if (status > 399) {
                errors.push(item.location)
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
            errors.push(item.location)
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
    fs.writeFileSync(path.join(__dirname, '..', '/public/westUA.m3u'), `#EXTM3U url-tvg="${urlTvg}"` + playlist.getM3uString());
})()
