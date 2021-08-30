const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const fs = require("fs");
const axios = require('axios');
const async = require("async");
let api1call = false;
let api2call = false;


/* GET home page. */
router.get('/', async function (req, res, next) {
    // await db.set('radis-key', 'redis-value');
    // const mydatapi1calla = await db.get('radis-key');
    // res.render('index', {title: mydata});
    // saveMarketOddsData();
    res.json("ok");
});


cron.schedule(process.env.CRON_ODDS_API, saveMarketOddsData);

cron.schedule(process.env.CRON_MARKET_LIST, saveMarketListData);

cron.schedule(process.env.CRON_EVENT_LIST, saveEventListData);

function saveMarketOddsData() {
    if (!api2call || !api1call) {
        apiStatus();
        console.log("\n*****************************************************************");
        console.log("Insert Market ODDS data into DB");
        db.client.hget("eventList", "event", (err, reply) => {
            if (err) {
                console.error(err);
            }
            if (reply) {
                let marketidArray = [];
                reply = JSON.parse(reply);
                reply.forEach(item => {
                    item.oddsData.market_id ? marketidArray.push(item.oddsData.market_id) : {};
                });
                let config = {
                    method: 'post',
                    url: process.env.ODDS_API,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(marketidArray)
                };
                axios(config).then(function (response) {
                    fs.writeFileSync("./public/ODDS_API.js",response.data.data,{encoding: "utf8"});
                    db.client.hset("API_RES", "ODDS_API", JSON.stringify(response.data.data));
                    response.data.data.items.forEach(item => {
                        let market_id = item.market_id;
                        let stringified = stringyfyValues(item);
                        if (stringified.market_id) {
                            db.client.hmset(`market-${market_id
                                }`, stringified);
                        }
                    });
                    console.log("Insert completed for Market ODDS data");
                    console.log("*****************************************************************\n");
                }).catch(function (error) {
                    console.log(error);
                });
            } else {
                console.log("No event list data");
                console.log("*****************************************************************\n");
            }
        })
    }
}

function saveEventListData() {
    api1call = true;
    if (!api2call) {
        apiStatus();
        console.log("\n*****************************************************************");
        console.log("Insert Event list data into DB");
        axios.get(process.env.EVENT_LIST).then(function (response) {
            if (response.data?.data[0]) {
                fs.writeFileSync("./public/EVENT_LIST_API.js",response.data.data,{encoding: "utf8"});
                db.client.hset("API_RES", "EVENT_LIST_API", JSON.stringify(response.data.data[0]));
                let result = response.data.data[0];
                result = stringyfyValues(result);
                db.client.hmset("eventList", result);
                console.log("Insert completed for Event list data");
                console.log("*****************************************************************\n");
            } else {
                console.log("No data to insert");
                console.log("*****************************************************************\n");
            }
            api1call = false;
        }, err => {
            console.error(err);
            api1call = false;
        }).catch(function (error) {
            console.error(error);
            api1call = false;
        });
    } else {
        api1call = false;
    }
}


function saveMarketListData() {
        api2call = true;
        if (!api1call) {
            apiStatus();
            console.log("\n*****************************************************************");
            console.log("Insert Market list data into DB");
            db.client.hgetall("eventList", (err, reply) => {
                if (err) {
                    console.error(err);
                }
                if (reply) {
                    let market_arr = []
                    reply = parseValues(reply);
                    let task = [];
                    reply.event.forEach((item) => {
                        task.push(function(cb){
                            async function inner(){
                                let market_list = {};
                                console.log("Inserting data for event: " + item.eventId);
                                let temp = await callMarketListAPI(process.env.MARKET_LIST + item.eventId, item);
                                temp = parseValues(temp);
                                market_list = item;
                                market_list.oddsData?.odds ? delete market_list.oddsData.odds : {};
                                market_list.runners = [];
                                Object.keys(temp).forEach((key)=>{
                                    if(Array.isArray(temp[key])){
                                        temp[key].forEach((item1)=>{
                                            if(item1.runners){
                                                market_list.runners = [...market_list.runners, ...item1.runners];
                                            }
                                        })
                                    }
                                });
                                market_arr.push(market_list);
                                cb(null,"done");
                            }
                            inner();
                        });
                    });
                    async.parallel(task,(err,task_res)=>{
                        db.client.hmset("marketList", "marketList", JSON.stringify(market_arr));
                        console.log("Insert completed for Market list data");
                        console.log("*****************************************************************\n");
                    })
                } else {
                    console.log("No data in event list");
                    console.log("*****************************************************************\n");
                }
            });
            api2call = false;
        } else {
            api2call = false;
        }
    }

function callMarketListAPI(url, item) {
    return new Promise((resolve, reject) => {
        axios.get(url).then(function (response) {
            if (response.data.data) {
                fs.writeFileSync(`./public/event-${item.eventId}`,response.data.data,{encoding: "utf8"});
                let result = stringyfyValues(response.data.data);
                db.client.hmset(`event-${item.eventId}`, result);
                resolve(response.data.data);
            } else {
                resolve(false);
            }
        }, err => {
            reject(err);
        })
    })
}

function stringyfyValues(object) {
    for (let [key, value] of Object.entries(object)) {
        object[key] = JSON.stringify(value);
    }
    return object;
}

function parseValues(object) {
    for (let [key, value] of Object.entries(object)) {
        try {
            object[key] = JSON.parse(value);
        } catch (e) {
            object[key] = value;
        }
    }
    return object;
}

function apiStatus() {
    if (api1call) {
        console.log("api1 call in progress");
        console.log("api1call: ", api1call);
        console.log("api2call: ", api2call);
    }
    else if (api2call) {
        console.log("api2 call in progress");
        console.log("api1call: ", api1call);
        console.log("api2call: ", api2call);
    }
    else {
        console.log("api3 call in progress");
        console.log("api1call: ", api1call);
        console.log("api2call: ", api2call);
    }
}

module.exports = router;
