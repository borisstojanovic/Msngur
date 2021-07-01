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

const deleteConversation = (array, value) => {
    let newArray = [];
    for(let i = 0; i< array.length; i++){
        if(String(array[i]) !== String(value)){
            newArray.push(array[i])
        }
    }
    return newArray;
}

/**
 * Adds the user whose id matches userId request parameter to the conversations array of the logged in user
 * At the same time adds the logged in user to the conversations array of the user with userId
 */
route.post('/addConversation', [authJwt.verifyToken], bodyParser.json(), (req, res) => {
    if(req.userId === req.body.user)return res.status(404).json("Bad Request");

    User.findOne({_id: req.userId})
        .then(user => {
            if(user.conversations.includes(req.body.user))return res.status(404).json("Conversation already exists!");
            user.conversations.push(req.body.user);
            user.save()
                .then(() => {
                    User.findOne({_id: req.body.user})
                        .then(member => {
                            member.conversations.push(user._id);
                            member.save()
                                .then(() => res.status(200).json(user))
                                .catch(err => res.status(500).json(err))
                        })
                        .catch(err => {
                            user.conversations = deleteConversation(user.conversations, req.body.user);
                            user.save()
                                .then(() => res.status(404).json("User Does Not Exist!"))
                                .catch(err => res.status(500).json(err))
                        })
                })
                .catch(err => res.status(500).json(err))
        })
})

module.exports = route