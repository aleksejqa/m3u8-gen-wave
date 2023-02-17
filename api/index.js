const fs = require('fs');

module.exports = async (req, res) => {
    let time = '';
    try {
        const s = await fs.statSync('./public/west.m3u');
        time = 'time ' + s.ctime;
    } catch (e) {
        time = 'currently no files';
    }

    res.send(`<div><div>${time}</div><ul><li><a href="/api/update">Update</a></li><li><a href="/public/west.m3u">get</a></li></ul></div>`)

};
