const express = require('express');
const Joi = require('joi');
const route = express.Router();
const bodyParser = require('body-parser')
const db = require("../models");
const User = db.user;
const Group = db.group;
const { authJwt } = require("../middleware");

const scheme = Joi.object().keys({
    owner: Joi.string().required(),
    name: Joi.string().min(3).max(24).required()
})

const addScheme = Joi.object().keys({
    owner: Joi.string().required(),
    user: Joi.string().required(),
    group: Joi.string().required()
})

/**
 * Creates a new group with the given owner/admin, name and members
 * Then it adds the new group to each members conversations and saves them
 */
route.post('/create', [authJwt.verifyToken], bodyParser.json(), (req, res) => {
    let {error} = Joi.validate(req.body, scheme);
    if (error) return res.status(400).send(error.details[0].message);

    User.findOne({_id: req.body.owner}, (err, user) => {
        if (err) res.status(500).json("Something went wrong.")
        else if (!user) res.status(404).json("No such user.")
        else {
            const group = new Group({admin: user, member: [user._id], name: req.body.name})
            group.save((err, group) => {
                if (err) {
                    res.status(500).send({message: err});
                    return;
                }
                user.conversations.push(group._id)
                user.save()
                    .then(() => res.json({message: "Group created.", group}))
            })
        }
    })
})

/**
 * Adds a new member to an existing group
 * At the same time adds the group to the new members conversations and saves them both
 */
route.post('/add', [authJwt.verifyToken], bodyParser.json(), (req, res) => {
    let {error} = Joi.validate(req.body, addScheme);
    if (error) return res.status(400).send(error.details[0].message);

    User.findOne({_id: req.body.owner}, (err, user) => {
        if(err) res.status(500).json("Something went wrong.")
        else if(!user) res.status(404).json("User not found.")
        else{
            Group.findOne({_id: req.body.group}, (err, group) => {
                if(err) res.status(500).json("Something went wrong.")
                else if(!group) res.status(404).json("Group not found.")
                else{
                    let groupId = group._id;
                    User.findOne({_id: req.body.user}, (err, user) => {
                        if(err) res.status(500).json("Something went wrong.")
                        else if(!user) res.status(404).json("Member not found")
                        else{
                            if(user.conversations.includes(groupId)){
                                return res.status(404).json({message: "Already contains member"});
                            }
                            user.conversations.push(groupId);
                            user.save()
                                .then(() => {
                                    group.member.push(user._id);
                                    group.save()
                                        .then(() => {res.json({message:"Success", group})})
                                        .catch(() => res.status(500).json("Something went wrong."))
                                })
                                .catch(err => {
                                    res.status(500).json(err.message);
                                })
                        }
                    })
                }
            })
        }
    })
})

route.get('/getById/:groupId', [authJwt.verifyToken], (req, res) => {
    Group.findById(req.params.groupId)
        .then(group => res.json(group) )
        .catch(() => res.status(500).json("Something went wrong."))
})

//returns all groups whose name matches the route param name
route.get('/getByName/:name', [authJwt.verifyToken], (req, res) => {
    Group.find({name: {$regex: ".*" + req.params.name + ".*", $options: 'i'}})
        .then(groups => res.json(groups))
        .catch(() => res.status(500).json("Something went wrong."))
})

//used to remove group from users conversation array
const deleteConversation = (array, value) => {
    let newArray = [];
    for(let i = 0; i< array.length; i++){
        if(String(array[i]) !== String(value)){
            newArray.push(array[i])
        }
    }
    return newArray;
}

route.delete('/delete/:groupId', [authJwt.verifyToken], async (req, res) => {
    Group.findOne({_id: req.params.groupId})
        .then(group => {
            //if user trying to delete group isn't the admin don't allow delete
            if(String(group.admin) !== req.userId) return res.status(403).json({message: "Forbidden"});
            User.findOne({_id: group.admin})
                .then(user => {
                    let groupId = group._id;

                    //go through all members of the group and remove the group from their conversations
                    //if all are removed resolve, if save fails reject

                    let deleteConversations = function () {
                        return new Promise( (resolve, reject) => {
                            for (let i=0; i<group.member.length; i++) {
                                User.findOne({_id: group.member[i]})
                                    .then(singleUser => {
                                        singleUser.conversations = deleteConversation(singleUser.conversations, groupId)
                                        singleUser.save()
                                            .then(() => {
                                                if(i === group.member.length - 1)resolve()})

                                    })
                            }
                        })
                    }
                    deleteConversations()
                        .then(() => {
                            group.delete().then(() => {
                                res.status(200).json("Success")
                            })
                        })
                })
                .catch(err => res.status(500).json(err))
            .catch(() => res.status(500).json("Something went wrong."))
        })
        .catch(() => res.status(500).json("No such group."))
})

//removes the user passed in req.body as user
//if user trying to remove the user isn't the group admin or the user being removed access is forbidden
route.post('/removeMember',[authJwt.verifyToken] ,bodyParser.json(), (req, res) => {
    Group.findOne({_id: req.body.group})
        .then(group => {
            if(String(group.admin) === req.body.user)return res.status(404).json({message: "Admin can't leave his own group"})
            if(String(group.admin) !== req.userId && req.body.user !== req.userId)res.status(403).json({message: "Forbidden Access"});
            else{
                if(group.member.includes(req.body.user)){
                    const deleteConversations = new Promise((resolve, reject) => {
                        User.findOne({_id: req.body.user})
                            .then(user => {
                                user.conversations = deleteConversation(user.conversations, group._id)
                                user.save()
                                    .then(() => resolve())
                                    .catch(() => reject())
                            })
                    })
                    deleteConversations
                        .then(() => {
                            group.member = deleteConversation(group.member, req.body.user)
                            group.save()
                                .then(() => res.json({group, message: "Success"}))
                        })
                        .catch(() => res.status(500).json("Something went wrong."))
                }
                else res.status(400).json("Something went wrong.")
            }
        })
        .catch(() => res.status(500).json("Something went wrong."))
})

module.exports = route