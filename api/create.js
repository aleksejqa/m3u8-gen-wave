const {M3uPlaylist} = require("m3u-parser-generator");
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const urlTvg = 'https://iptvx.one/epg/epg.xml.gz';

const playlist = new M3uPlaylist();
playlist.title = 'West playlist2';

async function fetchWithTimeout(resource, options = {}) {
    const {timeout = 5000} = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

module.exports = (async () => {
    const channels = await fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json());
    const streams = await fetch('https://iptv-org.github.io/api/streams.json').then(r => r.json());

    const ua_ch = channels.filter(({languages}) => {
        if (languages.indexOf('ukr') !== -1) {
            return true
        }
        return languages.indexOf('rus') !== -1;
    })
    bar1.start(ua_ch.length, 0);

    for (const {id, name, languages, country, categories, logo} of ua_ch) {
        const st = streams.find(({channel}) => channel === id);
        if (st) {
            try {
                const {status} = await fetchWithTimeout(st.url);
                if (status < 400) {
                    playlist.medias.push({
                        name: name,
                        location: st.url,
                        group: categories.join(';'),
                        duration: -1,
                        attributes: {
                            "tvg-id": id,
                            "tvg-language": languages.join(';'),
                            "tvg-country": country,
                            "tvg-logo": logo,
                            "group-title": categories.join(';')
                        }
                    })
                }
            } catch (e) {
            }
        }
        bar1.increment()
    }


    bar1.stop();

    console.log('end: ' + playlist.medias.length);
    fs.writeFileSync(path.join(__dirname, '..', '/public/westNew.m3u'), `#EXTM3U url-tvg="${urlTvg}"` + playlist.getM3uString());

})()
