const express = require('express');
const Joi = require('joi');
const route = express.Router();
const bodyParser = require('body-parser')
const db = require("../models");
const Message = db.message;
const User = db.user;
const Group = db.user;
const { authJwt } = require("../middleware");

const scheme = Joi.object().keys({
    message: Joi.string().trim().max(256).required(),
})

route.post("/new", [authJwt.verifyToken], bodyParser.json(), (req, res) => {
    let {error} = Joi.validate(req.body, scheme);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }

});

/**
 * Creates a new message in a private chat using sender and recipient ids
 * This function is used in socket.io websocket and isn't part of the routes
 * @param sender
 * @param recipient
 * @param message
 * @returns {Promise<null>}
 */
const createUserMessage = async (sender, recipient, message) => {
    let response = null;
    await User.findOne({_id: sender})
        .then(async user => {
            if(user) await User.findOne({_id: recipient})
                .then(recipientUser => {
                    if(recipientUser){
                        if(!recipientUser.conversations.includes(user._id)){
                            recipientUser.conversations.push(user._id);
                            recipientUser.save();
                        }
                        const newMessage = new Message({recipient: recipientUser._id, sender: user._id, message: message})
                        newMessage.save()
                        response = {
                            recipient: {username: recipientUser.username, id: recipientUser._id}, sender: {username: user.username, id: user._id},
                            message: message
                        }
                    }
                })
        })
    return response;
}

/**
 * Creates a new message in a group chat using sender and recipient ids where the recepient id is a group
 * This function is used in socket.io websocket and isn't part of the routes
 * @param sender
 * @param group
 * @param message
 * @returns {Promise<null>}
 */
const createGroupMessage = async (sender, group, message) => {
    let response = null;
    await User.findOne({_id: sender})
        .then(async user => {
            if(user) await Group.findOne({_id: group})
                .then(group => {
                    if(group){
                        const newMessage = new Message({recipient: group._id, sender: user._id, message: message})
                        newMessage.save()
                        response = {
                            recipient: {id: group._id, member: group.member, name: group.name}, sender: {username: user.username, id: user._id},
                            message: message
                        }
                    }
                })
        })
    return response
}

/**
 * Used to start a new private conversation between two users
 * @param sender
 * @param recipient
 * @returns {Promise<void>}
 */
const startMessage = async (sender, recipient) => {
    User.findOne({_id: sender}, (err, user) => {
        if(err) return null;
        else if(!user) return null;
        else{
            User.findOne({id_: recipient}, async (err, _user) => {
                if(err) return null;
                else if(!_user) return null;
                else{
                    if(!user.conversations.includes(_user._id) && sender !== recipient){
                        user.conversations.push(_user._id)
                        await user.save()
                            .then(() => {return true})
                            .catch(() => {return null;})
                    }
                }
            })
        }
    })
}

route.get('/all/:recipientId', [authJwt.verifyToken], (req, res) => {
    const {user, token, target} = req.body;
    User.findOne({_id: user, token}, (err, user) => {
        if(err) res.status(500).json("Something went wrong.");
        else if(!user) res.status(403).json("Permission denied.")
        else{
            User.findOne({email: target}, (err, _user) => {
                if(err) res.status(500).json("Something went wrong.");
                else if(!_user) res.status(404).json("User not found.")
                else{
                    Message.find({sender: user, recipient: _user._id})
                        .then(message => {
                            Message.find({sender: _user._id, recipient: user}, (err, _message) => {
                                if(err) res.status(500).json("Something went wrong.");
                                else{
                                    let result = message.concat(_message)
                                    result.sort((a, b) => {
                                        return new Date(a.createdAt) - new Date(b.createdAt)
                                    });
                                    let finalResult = []
                                    result.forEach(msg => {
                                        if(String(msg.sender) === String(user._id)){
                                            _info = {
                                                recipient: {email: _user.email, id: _user._id}, sender: {email: user.email, id: user._id},
                                                iv: msg.iv, message: msg.message, key: msg.key
                                            }
                                        }else{
                                            _info = {
                                                recipient: {email: user.email, id: user._id}, sender: {email: _user.email, id: _user._id},
                                                iv: msg.iv, message: msg.message, key: msg.key
                                            }
                                        }
                                        finalResult.push(_info)
                                    })
                                    res.json(finalResult)
                                }
                            })
                        })
                        .catch(() => {res.status(500).json("Something went wrong.");})
                }
            })
        }
    })
})

route.get('/getMessagesForGroup/:groupId', [authJwt.verifyToken], (req, res) => {
    const {user, token, target} = req.body;
    User.findOne({_id: user, token}, (err, user) => {
        if(err) res.status(500).json("Something went wrong.");
        else if(!user) res.status(403).json("Permission denied.")
        else{
            Group.findOne({code: target}, (err, group) => {
                if(err) res.status(500).json(err);
                else if(!group) res.status(404).json("Group not found.")
                else{
                    Message.find({recipient: group._id})
                        .then(messages => {
                            let finalResult = [];
                            const getMessages = new Promise((resolve, reject) => {
                                messages.forEach((message, index, array) => {
                                    if(message.sender !== user._id){
                                        User.findById(message.sender)
                                            .then(sender => {
                                                finalResult.push({sender: {id: sender._id, email: sender.email}, recipient: {id: group._id, group: group.code},
                                                    iv: message.iv, message: message.message, key: message.key})
                                            })
                                            .then(() => {if(index === array.length - 1 || array.length === 0) resolve()})
                                    }else{
                                        finalResult.push({sender: {id: user._id, email: user.email}, recipient: {id: group._id},
                                            iv: message.iv, message: message.message, key: message.key})
                                        if(index === array.length - 1 || array.length === 0) resolve()
                                    }
                                })
                            })
                            getMessages
                                .then(() => res.json(finalResult))
                        })
                        .catch((err) => {res.status(500).json("Something went wrong.");})
                }
            })
        }
    })
})

module.exports = {createUserMessage, messageRouter: route, startMessage, createGroupMessage}