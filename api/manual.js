const fs = require("fs");
const path = require("path");
const {M3uPlaylist} = require("m3u-parser-generator");

const manual = require('../public/manual.json')
const playlist = new M3uPlaylist();
playlist.title = 'West playlist UA';
const urlTvg = 'https://iptvx.one/epg/epg.xml.gz';

module.exports = (async () => {
    const channels = await fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json());

    let i = 0;
    for (const item of manual.sort((a, b) => a.name < b.name ? -1 : 1)) {
        const cha = channels.filter(({name, id, alt_names}) => [name, id, ...alt_names].some(c => {
            if (typeof c === "string") {
                return c.trim().toLowerCase().indexOf(item.name.toLowerCase()) !== -1
            } else {
                if (c.value) {
                    return c.value.trim().toLowerCase().indexOf(item.name.toLowerCase()) !== -1
                } else {
                    return false
                }
            }

        }))
        const ch = cha[0];
        if (ch) {
            if(cha.length > 0){
                const ua = cha.find(({country}) => country === 'UA');
                const ru = cha.find(({country}) => country === 'RU');
                if(ua){
                    item.attributes = {
                        "tvg-id": ua.id,
                        "tvg-language": ua.languages.join(';'),
                        "tvg-country": ua.country,
                        "tvg-logo": ua.logo,
                        "group-title": ua.categories.join(';') || 'УКРАИНА'
                    }
                } else if( ru) {
                    item.attributes = {
                        "tvg-id": ru.id,
                        "tvg-language": ru.languages.join(';'),
                        "tvg-country": ru.country,
                        "tvg-logo": ru.logo,
                        "group-title": ru.categories.join(';') || 'УКРАИНА'
                    }
                } else {
                    item.attributes = {
                        "tvg-id": ch.id,
                        "tvg-language": ch.languages.join(';'),
                        "tvg-country": ch.country,
                        "tvg-logo": ch.logo,
                        "group-title": ch.categories.join(';') || 'УКРАИНА'
                    }
                }
                i++
            }

        }
        playlist.medias.push(item);
    }
    console.log('all: ' + playlist.medias.length);
    console.log('with info: ' + i);

    fs.writeFileSync(path.join(__dirname, '..', '/public/manual.json'), JSON.stringify(playlist.medias));
    fs.writeFileSync(path.join(__dirname, '..', '/public/manual.m3u'), `#EXTM3U url-tvg="${urlTvg}"` + playlist.getM3uString());


})()
