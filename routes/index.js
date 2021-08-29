const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const cron = require("node-cron");
const cluster = require('cluster');
const axios = require('axios');
const async = require("async");
let api1call = false;
let api2call = false;
var net = require('net');
let timer1, timer2;
// import { WebSocketServer } from 'ws';
const WebSocket = require("ws");


let getOddsData = function () {
    return new Promise((resolve, reject) => {
        db.client.hget("API_RES", "ODDS_API", (err, reply) => {
            if (err) {
                reject(err);
            } else {
                reply ? resolve(reply) : resolve("no data");
            }
        })
    });
}


let getMarketEventData = function () {
    return new Promise((resolve, reject) => {
        let obj = {};
        db.client.keys("event-*", (err, keys) => {
            if (err) {
                console.log("errerrerr", err);
            }
            let result = {};
            if (keys.length) {
                let tasks = [];
                let events = {};
                keys.forEach(key => {
                    tasks.push(function (cb) {
                        db.client.hgetall(key, (err, reply) => {
                            events[key] = parseValues(reply);
                            cb(null, "done");
                        })
                    });
                });
                async.series(tasks, function (err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        obj.EVENT_LIST_API = events;

                        db.client.keys("market-*", (err, keys) => {
                            if (err) {
                                console.log("errerrerr", err);
                            }
                            if (keys.length) {
                                let mtasks = [];
                                let markets = {};
                                keys.forEach(key => {
                                    mtasks.push(function (cb) {
                                        db.client.hgetall(key, (err, reply) => {
                                            markets[key] = parseValues(reply);
                                            cb(null, "done");
                                        })
                                    });
                                });
                                async.series(mtasks, function (err, res) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        obj.MARKET_LIST_API = markets;
                                        resolve(JSON.stringify(obj));
                                    }
                                });
                            } else {
                                obj.MARKET_LIST_API = {};
                                obj = JSON.stringify(obj);
                                resolve(obj);
                            }
                        });
                    }
                });
            } else {
                obj.EVENT_LIST_API = result;
                obj = JSON.stringify(obj);
                resolve(obj);
            }
        });
    });
}

var oddsAPIserver = new WebSocket.Server({ port: 8000 });

oddsAPIserver.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });
    timer1 = setInterval(async () => {
        let oddsData = await getOddsData();
        ws.send(oddsData);
    }, process.env.ODDS_SOCKET_TIMER);

    ws.on("close", () => {
        clearInterval(timer1);
    });
});


var eventMarketListServer = new WebSocket.Server({ port: 8001 });

eventMarketListServer.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.on("close", () => {
        clearInterval(timer2);
    });

    timer2 = setInterval(async () => {
        let obj = {};
        try {
            obj = await getMarketEventData();
        } catch (e) {
            console.log(e);
        }
        ws.send(obj);
    }, process.env.EVENT_SOCKET_TIMER);

});

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
                let market_list = {};
                reply = parseValues(reply);
                reply.event.forEach(async (item) => {
                    console.log("Inserting data for event: " + item.eventId);
                    let temp = await callMarketListAPI(process.env.MARKET_LIST + item.eventId, item);
                    temp = parseValues(temp);
                    temp.runners = [];
                    Object.keys(temp).forEach((key)=>{
                        if(Array.isArray(temp[key])){
                            temp[key].forEach((item)=>{
                                if(item.runners){
                                    temp.runner = [...temp.runners, ...item.runners];
                                }
                            })
                        }
                    });
                    db.client.hmset("marketList", JSON.stringify(temp));
                });
                console.log("Insert completed for Market list data");
                console.log("*****************************************************************\n");
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
