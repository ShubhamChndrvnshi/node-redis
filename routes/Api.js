const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const async = require("async");
const apiResponse = require("../apiResponse");


router.get("/odds",getOdds);

router.get("/events",getEvents);


function getOdds(_req, res){
    try{
        db.client.hmget("marketList",(err,reply)=>{
            console.log(reply);
        });
        db.client.keys("market-*", (err, keys) => {
            if (err) {
                return apiResponse.ErrorResponse(res, err.message);
            }
            else if (keys.length) {
                let mtasks = [];
                let markets = [];
                keys.forEach(key => {
                    mtasks.push(function (cb) {
                        db.client.hgetall(key, (err, reply) => {
                            if(err){
                                cb(null, err);
                            }else{
                                let parsed = parseValues(reply);
                                markets.push(parsed);
                                cb(null, "done");
                            }
                        })
                    });
                });
                async.series(mtasks, function (err, response) {
                    console.log(err);
                    console.log(response);
                    if (err) {
                        return apiResponse.ErrorResponse(res, err.message);
                    } else {
                        return apiResponse.successResponseWithData(res, "Success",markets);
                    }
                });
            } else {
                return apiResponse.successResponseWithData(res, "Success..!!",[]);
            }
        });
    }catch(e){
        return apiResponse.ErrorResponse(res, e.message);
    }
}

function getEvents(req, res){
    try{
        return apiResponse.successResponseWithData(res, "Success");
    }catch(e){
        return apiResponse.ErrorResponse(res, e.message);
    }
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