const express = require('express');
const router = express.Router();
const db = require('../dbconfig');
const apiResponse = require("../apiResponse");


router.get("/odds",getOdds);

router.get("/events",getEvents);


function getOdds(_req, res){
    try{
        return apiResponse.successResponse(res,"Ok");
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

module.exports = router;