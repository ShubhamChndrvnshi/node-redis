const db = require('../dbconfig');
const async = require("async");
const WebSocket = require("ws");
let timer1, timer2;


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