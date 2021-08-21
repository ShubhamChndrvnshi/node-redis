const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const cluster = require('cluster');
const axios = require('axios');
let api1call = false;
let api2call = false;
var net = require('net');
let timer1, timer2;


let getOddsData = function () {
    return new Promise((resolve, reject) => {
        db.client.hget("API_RES", "ODDS_API", (err, reply) => {
            if (err) {
                reject(err);
            } else {
                reply ? resolve(reply): resolve("no data");
            }
        })
    });
}

let getMarketEventData = function () {
    return new Promise((resolve, reject) => {
        db.client.hget("API_RES", "MARKET_LIST_API", (err, market_reply) => {
            if (err) {
                reject(err);
            } else {
                db.client.hget("API_RES", "EVENT_LIST_API", (err, reply) => {
                    if (err) {
                        reject(err);
                    } else {
                        let obj = {};
                        try {
                            obj.MARKET_LIST_API = JSON.parse(market_reply);
                        } catch (e) {
                            obj.MARKET_LIST_API = "no data";
                        }
                        try {
                            obj.EVENT_LIST_API = JSON.parse(reply);
                        } catch (e) {
                            obj.EVENT_LIST_API = "no data";
                        }
                        obj = JSON.stringify(obj);
                        resolve(obj);
                    }
                });
            }
        });
    });
}


var oddsAPIserver = net.createServer(function (socket) {
    timer1 = setInterval(async () => {
        let oddsData = await getOddsData();
        socket.write(oddsData);
        socket.write("\n");
        socket.write("\n");
    }, process.env.ODDS_SOCKET_TIMER);
    socket.on("close",()=>{
        clearInterval(timer1);
    });
    socket.on("error",()=>{
        clearInterval(timer1);
    });
    socket.on("end",()=>{
        clearInterval(timer1);
    });
});

oddsAPIserver.listen(8000);


var eventMarketListServer = net.createServer(function (socket) {
    timer2 = setInterval(async () => {
        let obj = await getMarketEventData();
        socket.write(obj);
        socket.write("\n");
        socket.write("\n");
    },process.env.EVENT_SOCKET_TIMER);
    socket.on("close",()=>{
        clearInterval(timer2);
    });
    socket.on("error",()=>{
        clearInterval(timer2);
    });
    socket.on("end",()=>{
        clearInterval(timer2);
    });
});

eventMarketListServer.listen(8001);


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
    console.log("*****************************************************************");
    console.log("Insert Market ODDS data into DB");
    console.log("*****************************************************************");
    if (!api2call) {
        db.client.hget("event-list", "event", (err, reply) => {
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
                    db.client.hset("API_RES", "ODDS_API", JSON.stringify(response.data.data));
                    response.data.data.items.forEach(item => {
                        let market_id = item.market_id;
                        let stringified = stringyfyValues(item);
                        if (stringified.market_id) {
                            db.client.hmset(`market-${market_id
                                }`, stringified);
                        }
                    });
                    console.log("*****************************************************************");
                    console.log("Insert completed for Market ODDS data");
                    console.log("*****************************************************************");
                }).catch(function (error) {
                    console.log(error);
                });
            } else {
                console.log("No event list data");
            }
        })
    }
}

function saveEventListData() {
    console.log("*****************************************************************");
    console.log("Insert Event list data into DB");
    console.log("*****************************************************************");
    axios.get(process.env.EVENT_LIST).then(function (response) {
        api1call = true;
        if(response.data?.data[0]){
            db.client.hset("API_RES", "EVENT_LIST_API", JSON.stringify(response.data.data[0]));
            let result = response.data.data[0];
            result = stringyfyValues(result);
            db.client.hmset("event-list", result);
            console.log("*****************************************************************");
            console.log("Insert completed for Event list data");
            console.log("*****************************************************************");
        } else{
            console.log("No data to insert");
        }
        api1call = false;
    }).catch(function (error) {
        console.error(error);
    });
}


function saveMarketListData() {
    console.log("*****************************************************************");
    console.log("Insert Market list data into DB");
    console.log("*****************************************************************");
    if (!api1call) {
        db.client.hgetall("event-list", (err, reply) => {
            if (err) {
                console.error(err);
            }
            if (reply) {
                reply = parseValues(reply);
                reply.event.forEach(item => {
                    console.log("Inserting data for event: " + item.eventId);
                    axios.get(process.env.MARKET_LIST + item.eventId).then(function (response) {
                        api2call = true;
                        if (response.data.data) {
                            let result = stringyfyValues(response.data.data);
                            db.client.hmset(`event-${item.eventId
                                }`, result);
                        }
                        db.client.hset("API_RES", "MARKET_LIST_API", JSON.stringify(response.data.data));
                        console.log("*****************************************************************");
                        console.log("Insert completed for Market list data");
                        console.log("*****************************************************************");
                        api2call = false;
                    }).catch(function (error) {
                        console.error(error);
                    });
                })
            } else {
                console.log("No data in event list");
            }
        });
    }
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

module.exports = router;
