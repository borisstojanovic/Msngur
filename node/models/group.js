const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        required: true
    },
    member: {
        type: Array,
        required: false
    },
    imagePath: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: true
    },
    type:{
        type: Boolean,
        required: true
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Group", GroupSchema);