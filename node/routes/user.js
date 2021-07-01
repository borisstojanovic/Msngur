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

route.get('/all', [authJwt.verifyToken], (req, res) => {
    User.find({})
        .then(users => res.status(200).json(users))
        .catch(err => res.status(500).json("Error: "+err));
})

route.get('/getById/:userId', [authJwt.verifyToken], (req, res) => {
    User.findOne({_id: req.params.userId})
        .then(user => res.status(200).json(user))
        .catch(err => res.status(404).json("No Such User Exists"));
})

route.get('/getByUsername/:username', [authJwt.verifyToken], (req, res) => {
    User.findOne({username: req.body.username}, (err, user) => {
        if (err) res.status(500).json("Error: " + err);
        else if (!user) res.status(404).json("User not found.")
        else res.status(200).json(user);
    })
})

route.get('/getByUsernameLike/:username', [authJwt.verifyToken], (req, res) => {
    User.find({username: {$regex: ".*" + req.params.username + ".*", $options: 'i'}}, (err, users) => {
        if (err) res.status(500).json("Error: " + err);
        else if (users.length === 0) res.status(404).json("Users not found.");
        else {
            res.status(200).json(users);
        }
    })
})

module.exports = route