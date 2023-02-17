const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = require('node-fetch');
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

const getData = async () => {
    const b = M3uParser.parse(await (await fetch(pl1).then(r => r.blob())).text());
    const b2 = M3uParser.parse(await (await fetch(pl2).then(r => r.blob())).text());
    const b3 = M3uParser.parse(await (await fetch(pl3).then(r => r.blob())).text());

    const result = [];

    const medias = [...b3.medias]
        .filter((item) => item.location.indexOf('.mp4') === -1)
        .filter((item) => item.location.indexOf('.ru:') === -1)
        .filter((item) => item.location.indexOf('.ru/') === -1);

    medias.forEach((item) => {
        if (!result.some(a => a.location.trim() === item.location.trim()) && !excluded.some(a => a.trim() === item.location.trim())) {
            result.push({
                ...item,
                name: item.name
                    .replace('\r', '')
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
                    const r = await res.blob();
                    if (r.size === 0) {
                        errors["300"].push(item.location);
                    } else {
                        const a = await r.text();
                        const v = a.split(',')
                            .find(b => b.indexOf('RESOLUTION') !== -1);

                        if(v){
                            const ad = v.replace('RESOLUTION=', '');
                            if(ad && ad.indexOf('chunklist') === -1){
                                item.attributes.resolution = ad;
                            }
                        }

                        if(!excluded.some( (a) => res.url.indexOf(a) !== -1)){
                            // if(a.medias){
                            //     a.medias.forEach(c => c.attributes.resolution)
                            //     console.log(item.attributes.resolution);
                            // }
                            if(res.redirected){
                                item.location = res.url.indexOf('.m3u8') === -1 ? res.url + '.m3u8' : res.url
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


    res2.sort((a, b) => {
        if(a.attributes.resolution && b.attributes.resolution){
            if(parseInt(
                a.attributes.resolution.split('x')[0]
            ) < parseInt(
                b.attributes.resolution.split('x')[0]
            )){
                return -1;
            }
            return 1;
        }
        return -1;

    }).forEach((item) => {
        if (!playlist.medias.some(a => a.location.trim() === item.location.trim())) {
            if(!playlist.medias.some(a => a.name.trim() === item.name.trim())){
                playlist.medias.push(item)
            }
        }
    })

    console.log(playlist.medias);
    console.log('duplicated: ' + res2.length);
    console.log('END: ' + playlist.medias.length);
    fs.writeFileSync('../public/errors.json', JSON.stringify(errors));
    fs.writeFileSync('../public/west.m3u', playlist.getM3uString());
}

module.exports = getData;
