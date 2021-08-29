const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const async = require("async");
const apiResponse = require("../apiResponse");


router.get("/odds",getOdds);

router.get("/events",getEvents);


function getOdds(_req, res){
    try{
        db.client.hget("marketList","marketList",(err,reply)=>{
            if (err) {
                return apiResponse.ErrorResponse(res, err.message);
            } else {
                return apiResponse.successResponseWithData(res, "Success",JSON.parse(reply));
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