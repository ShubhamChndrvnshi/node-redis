/* eslint-disable linebreak-style */
const i18n = require("i18n");

function translate(msg){
	if(Array.isArray(msg)){
		for (const keys in msg) {
			msg[keys] = i18n.__(msg[keys]);
		}
	}else{
		msg = i18n.__(msg);
	}
	return msg;
}

exports.successResponse = function (res, msg) {
	msg = translate(msg);
	var data = {
		status: 1,
		message: msg
	};
	return res.status(200).json(data);
};

exports.successResponseWithData = function (res, msg, data) {
	msg = translate(msg);
	var resData = {
		status: 1,
		message: msg,
		data: data
	};
	return res.status(200).json(resData);
};

exports.ErrorResponse = function (res, msg) {
	msg = translate(msg);
	var data = {
		status: 0,
		message: msg
	};
	return res.status(400).json(data);
};

exports.ErrorResponseWithData = function (res, msg, data) {
	msg = translate(msg);
	var resData = {
		status: 0,
		message: msg,
		data: data
	};
	return res.status(400).json(resData);
};

exports.notFoundResponse = function (res, msg) {
	msg = translate(msg);
	var data = {
		status: 0,
		message: msg,
	};
	return res.status(404).json(data);
};

exports.validationErrorWithData = function (res, msg, data) {
	msg = translate(msg);
	var resData = {
		status: 0,
		message: msg,
		data: data
	};
	return res.status(400).json(resData);
};

exports.validationError = function (res, msg) {
	msg = translate(msg);
	var resData = {
		status: 0,
		message: msg
	};
	return res.status(400).json(resData);
};

exports.unauthorizedResponse = function (res, msg) {
	msg = translate(msg);
	var data = {
		status: 0,
		message: msg,
	};
	return res.status(401).json(data);
};