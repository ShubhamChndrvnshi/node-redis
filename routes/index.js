const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const cluster = require('cluster');
const axios = require('axios');

/* GET home page. */
router.get('/', async function (req, res, next) {
    await db.set('radis-key', 'redis-value');
    const mydata = await db.get('radis-key');
    res.render('index', {title: mydata});
});


function saveEventListData() {
    console.log("Insert Event list data into DB");
    axios.get(process.env.EVENT_LIST).then(function (response) {
        let result = response.data.data[0];
        result.event = JSON.stringify(result.event);
        db.hmset("event-list",...result);
    }).catch(function (error) {
        console.error(error);
    });
}


function saveMarketListData() {
    console.log("Insert Market list data into DB");
    axios.get(process.env.MARKET_LIST).then(function (response) {
        console.log(response.data);
    }).catch(function (error) {
        console.error(error);
    });
}


async function custom() {
    let reply = await db.get("worker");
    if (reply) {
        if (reply == cluster.worker.id) {
            db.set("worker_found", "1");
            cron.schedule(process.env.CRON_EVENT_LIST, saveEventListData);
            // cron.schedule(process.env.CRON_MARKET_LIST, saveMarketListData);
        }
    } else {
        await db.set("worker", `${
            cluster.worker.id
        }`);
    }
}
custom();


module.exports = router;
