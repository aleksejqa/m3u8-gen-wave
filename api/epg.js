const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const parser = require('epg-parser');
// const parser = (...args) => import('epg-parser').then(({default: parser}) => parser.parse(...args));
const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");

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
    const file = fs.readFileSync(path.join(__dirname, '..', '/iptv_ukr.m3u')).toString();
    const b = M3uParser.parse(file);

    const channels = await fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json());
    console.log('from m3u: ' + b.medias.length);

    const result = [];

    b.medias.sort((a, d) => a.name < d.name ? -1 : 1).forEach((item) => {
        if (!result.some(a => a.location.trim() === item.location.trim())) {
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

    console.log('without duplicates: ' + b.medias.length);

    let i = 0;

    for (const item of result) {
        const ch = channels.find(({name, id, alt_names}) => [name, id, ...alt_names].some(c => {
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
            item.attributes = {
                "tvg-id": ch.id,
                "tvg-language": ch.languages.join(';'),
                "tvg-country": ch.country,
                "tvg-logo": ch.logo,
                "group-title": ch.categories.join(';')
            }
            i++
        }
    }

    console.log(i);
    // const guides = await fetch('https://iptv-org.github.io/api/guides.json').then(r => r.json());

})()
