const express = require('express');
const Joi = require('joi');
const route = express.Router();
const bodyParser = require('body-parser')
const config = require("../config/auth");
const db = require("../models");
const User = db.user;
const fs = require('fs');
let jwt = require("jsonwebtoken");
const { cloudinary } = require('../config/cloudinary');

//multer setup
const uploads = require('./uploads');
const images = uploads.images;

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

const removeFile = function(path){
    fs.unlink(path, (err) => {
        if(err){
            throw new Error(err.message);
        }
    })
}

const uploadToCloudinary = function(image) {
    return new Promise((resolve, reject) => {
        let response = cloudinary.uploader.upload(image, (err, url) => {
            if (err) return reject(err);
            return resolve(response);
        })
    });
}

route.post("/register", images.single('image'), async (req, res) => {
    let {error} = Joi.validate(req.body, schemeRegister);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    let path = null;
    if(req.file !== undefined){
        let uploadedResponse = null;
        await uploadToCloudinary(path).then(response => {
            uploadedResponse = response;
        }).catch(err=>{
            return res.sendStatus(500).json(err);
        })
        path = uploadedResponse.public_id;
        removeFile(req.file.path);
    }
    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        path: path
    });

    //when save is called the password is encrypted automatically because of the pre function in user.model
    user.save((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        res.send({ message: "User was registered successfully!" , user: user});
    });

});

module.exports = route