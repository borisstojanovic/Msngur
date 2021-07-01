const express = require('express');
const Joi = require('joi');
const route = express.Router();
const bodyParser = require('body-parser')
const db = require("../models");
const User = db.user;
const { authJwt } = require("../middleware");

const scheme = Joi.object().keys({
    username: Joi.string().trim().min(3).max(12).required(),
    password: Joi.string().min(3).max(24).required()
})

const schemeRegister = Joi.object().keys({
    username: Joi.string().trim().min(3).max(12).required(),
    password: Joi.string().min(3).max(24).required(),
    password2: Joi.string().min(3).max(24).required(),
});

route.post("/test", [authJwt.verifyToken], bodyParser.json(), (req, res) => {
    res.status(200).send('Success')
});

module.exports = route