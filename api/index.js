const express = require('express');
const getData = require("./update");
const fs = require('fs');

const app = express();

app.get('/', async (req,res) => {
    let time = '';
    try {
        const s = await fs.statSync('./public/west.m3u');
        time = 'time ' + s.ctime;
    } catch (e) {
        time = 'currently no files';
    }

    res.send(`<div><div>${time}</div><ul><li><a href="/update">Update</a></li><li><a href="/public/west.m3u">get</a></li></ul></div>`)
})
app.get('/update', (req, res) => {
    getData();
    res.send('<div><button onclick="window.location.href=`/`; return false;">back</button><span>updating...</span></div>');
})
app.use(express.static('public'))

module.exports = app;
