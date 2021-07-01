const express = require('express');
const Joi = require('joi');
const route = express.Router();
const bodyParser = require('body-parser')
const config = require("../config/auth");
const db = require("../models");
const User = db.user;
let jwt = require("jsonwebtoken");

const scheme = Joi.object().keys({
    username: Joi.string().trim().min(3).max(12).required(),
    password: Joi.string().min(3).max(24).required()
})

const schemeRegister = Joi.object().keys({
    username: Joi.string().trim().min(3).max(12).required(),
    email: Joi.string().trim().min(3).max(34).required(),
    password: Joi.string().min(3).max(24).required(),
    password2: Joi.string().min(3).max(24).required(),
});

route.post("/signin", bodyParser.json(), (req, res) => {
    let {error} = Joi.validate(req.body, scheme);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    User.findOne({
        username: req.body.username
    }).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }
        //if there was no user with the target username return a bad request status
        if (!user) {
            return res.status(404).send({ message: "User Not found." });
        }

        //using the comparePassword to check if the passwords match
        //the function takes a callback and if the callback returns an error or isMatch is false login fails
        user.comparePassword(req.body.password, (err, isMatch)=> {
            if(err) res.status(500).json("Error has occured.");

            if(isMatch){
                let token = jwt.sign({ id: user.id }, config.secret, {
                    expiresIn: 86400 // 24 hours
                });

                res.status(200).send({
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    accessToken: token
                });
            }
            else {
                return res.status(401).send({
                    accessToken: null,
                    message: "Invalid Password!"
                });
            }
        })
    })
});

route.post("/register", bodyParser.json(), (req, res) => {
    let {error} = Joi.validate(req.body, schemeRegister);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });

    //when save is called the password is encrypted automatically because of the pre function in user.model
    user.save((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        res.send({ message: "User was registered successfully!" });
    });

});

module.exports = route