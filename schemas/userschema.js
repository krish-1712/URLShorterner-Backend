const validator = require('validator')
const mongoose = require('mongoose')


let UserSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            validate: (value) => {
                return validator.isEmail(value)
            }
        },
        password: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            default: false
        },
        token: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }

    },
    {
        collection: "users",
        versionKey: false
    }
)

let userModel = mongoose.model('users', UserSchema)
module.exports = { userModel }