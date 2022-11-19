import mongoose from "mongoose";
import { RESPONSE } from "./utils.js";

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    balance: Number,
    timeCreated: {
        type: Date,
        default: Date.now
    },
});

export const MongoUser = mongoose.model('User', userSchema);

export async function connectToMongoDB(username, password, error) {
    const accessToken = `mongodb+srv://${username}:${password}@aibank.dtbawuy.mongodb.net/?retryWrites=true&w=majority`;
    return mongoose.disconnect()
        .then(() => mongoose.connect(accessToken))
        .then(() => console.log(`Connected ${username} to MongoDB`))
        .catch(err => error.val = err);
}

export async function createUserInDB(user) {
    const newMongoUser = new MongoUser(user);
    const userTable = await newMongoUser.save();
    return userTable;
}

export async function userExists(email) {
    let error = false;
    const exists = await MongoUser
        .exists({ email: email })
        .catch(msg => {
            error = true;
            console.log("User balance find error: ", msg);
        });
    if (error) return -1;
    // const password = req.params.password;
    return exists;
}