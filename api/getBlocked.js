const {M3uParser, M3uPlaylist} = require("m3u-parser-generator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const s = require('../public/blocked.json');

async function fetchWithTimeout(resource, options = {}) {
    const {timeout = 3000} = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

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
    const medias = [];
    const blocked = s;
    const grouped = [];

    for (const p of pList) {
        const {medias: m} = M3uParser.parse(await (await fetch(p).then(r => r.blob())).text())
        medias.push(...m)
    }

    const getAllowed = (location) => ![...s.manual, ...s.error].some(a => location.trim().indexOf(a) !== -1)

    const mediasWithoutDisable = medias.filter(({location}) => {
        return getAllowed(location);
    })

    const mediasDisable = medias.filter(({location}) => {
        return [...s.manual, ...s.error].some(a => location.trim().indexOf(a) !== -1);
    })

    const catMapping = {
        ukraine: ['Українські', 'УКРАИНА'],
        sport: ['Спортивні', 'Спортивні +', 'СПОРТ 🏆', 'СПОРТ', 'Спорт'],
        film: ['Кино', 'Кіноканали', 'KINO+', 'Кинозалы'],
        entertainment: ['Розважальні', 'Развлекательные'],
        relax: ['РЕЛАКС- расслабление'],
        kids: ['Дети', 'Дитячі', 'ДІТИ'],
        music: ['МУЗЫКА'],
        kitchen: ['КУХНЯ'],
        cognitive: ['ПОЗНАВАТЕЛЬНЫЕ', 'Пізнавальні', 'Познавательные'],
        other: ['Казахстан', 'RELAX', 'РАДІО', 'ОБЩИЕ', 'МОЛДОВА']

    }

    const foreach = async (arr, isActive) => {
        const res = {};
        for (const item of arr) {
            item.name = item.name
                .replace(' r', ' ')
                .replace(' p', ' ')
                .replace(' р', ' ')
                .replace(' R', ' ')
                .replace('tva.in.ua', '')
                .replace('TV 1000', 'TV1000')
                .replace('tva.org.ua', '')
                .trim()
            const url = item.location.match(/(https|http):\/\/(.+?)\//)?.[0] || 'other';
            if (!res[url]) res[url] = []

            if (!res[url].some(a => a === item.location.trim())) {
                if (isActive) {
                    // try {
                    //     const a = await fetchWithTimeout(item.location.trim())
                    //     if (a.redirect) {
                    //         if (getAllowed(a.url)) {
                    //
                    //         }
                    //     } else {
                    //
                    //     }
                    // } catch (e) {
                    //
                    // }


                    const title = item.attributes["group-title"] || item.attributes[" group-title"];
                    const curr = Object.entries(catMapping).find(([key, val]) => val.some(a => a === title));
                    if (curr) {
                        item.attributes["group-title"] = curr[0]
                        // console.log(curr[0])
                    } else {
                        console.log(item);
                        item.attributes["group-title"] = 'other'
                    }
                    delete item.attributes[" group-title"]

                    // const key = item.name.trim()
                    //     .replace('tv 1000', 'tv1000')
                    //     .replace('-', ' ')
                    //     .toLowerCase().split(' ')[0];
                    //
                    // if (!grouped[key]) {
                    //     grouped[key] = [];
                    // }
                    //
                    // if (grouped[key]) {
                    //     grouped[key].push({
                    //         name: item.name.trim(),
                    //         location: item.location.trim(),
                    //         attributes: item.attributes
                    //     })
                    // }
                    grouped.push({
                        name: item.name.trim(),
                        location: item.location.trim(),
                        attributes: item.attributes
                    })


                }
                res[url].push(item.location.trim())

            }
        }
        return res;
    }

    const sorted = await foreach(mediasWithoutDisable, true);
    const disabled = await foreach(mediasDisable, false);
    console.log('allowed: ' + Object.keys(sorted).length);
    console.log('disabled: ' + Object.keys(disabled).length);
    console.log('to review: ' + grouped.length);
    fs.writeFileSync(path.join(__dirname, '..', '/public/grouped.json'),
        JSON.stringify(grouped.sort((a, b) => a.name < b.name ? -1 : 1))
    );
    fs.writeFileSync(path.join(__dirname, '..', '/public/blocked.json'), JSON.stringify(blocked));
    fs.writeFileSync(path.join(__dirname, '..', '/public/disabled.json'), JSON.stringify(disabled));
    fs.writeFileSync(path.join(__dirname, '..', '/public/sorted.json'), JSON.stringify(sorted));
})()
