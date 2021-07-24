const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const cluster = require('cluster');
const axios = require('axios');
let child;

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
        db.client.hmset("event-list",result);
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

cron.schedule(process.env.CRON_EVENT_LIST, saveEventListData);



module.exports = router;
