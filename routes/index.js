const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const cluster = require('cluster');
const axios = require('axios');
let api1call = false;
let api2call = false;
let api3call = false;

/* GET home page. */
router.get('/', async function (req, res, next) {
    await db.set('radis-key', 'redis-value');
    const mydatapi1calla = await db.get('radis-key');
    res.render('index', {title: mydata});
});


cron.schedule(process.env.CRON_EVENT_LIST, saveEventListData);

cron.schedule(process.env.CRON_MARKET_LIST, saveMarketListData);

function saveEventListData() {
    console.log("Insert Event list data into DB");
    axios.get(process.env.EVENT_LIST).then(function (response) {
        api1call = true;
        let result = response.data.data[0];
        result = stringyfyValues(result);
        db.client.hmset("event-list",result);
        api1call = false;
    }).catch(function (error) {
        console.error(error);
    });
}


function saveMarketListData() {
    console.log("Insert Market list data into DB");
    if(!api1call){
        db.client.hgetall("event-list",(err, reply)=>{
            if(err){
                console.error(err);
            }
            if(reply){
                reply = parseValues(reply);
                reply.event.forEach(item =>{
                    console.log("Inserting data for event: "+item.eventId);
                    axios.get(process.env.MARKET_LIST+item.eventId).then(function (response) {
                        api2call = true;
                        if(response.data.data){
                            let result = stringyfyValues(response.data.data);
                            db.client.hmset(`event-${item.eventId}`,result);
                        }
                        api2call = false;
                    }).catch(function (error) {
                        console.error(error);
                    });
                })
            }else{
                console.log("No data in event list");
            }
        });
    }
}

function stringyfyValues(object){
    for (let [key, value] of Object.entries(object)) {
        object[key] = JSON.stringify(value);
      }
      return object;
}

function parseValues(object){
    for (let [key, value] of Object.entries(object)) {
        try{
            object[key] = JSON.parse(value);
        }catch(e){
            object[key] = value;
        }
      }
      return object;
}

module.exports = router;
