import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    balance: Number,
    moneyRequestHistory: [{
        serverId: String,
        orderId: String,
        status: String,
        amount: Number,
        captureUrl: String,
        viewUrl: String,
        timeCreated: Date,
        timeCaptured: Date,
    }],
    timeCreated: {
        type: Date,
        default: Date.now
    },
});

export const User = mongoose.model('User', userSchema);

export async function connectToMongoDB(username, password) {
    // const token = "mongodb+srv://utkrisli:Wanting521@cluster0.kdtesgu.mongodb.net/?retryWrites=true&w=majority";
    const accessToken = `mongodb+srv://${username}:${password}@cluster0.bazpvfn.mongodb.net/?retryWrites=true&w=majority`;
    return mongoose.disconnect()
        .then(() => mongoose.connect(accessToken))
        .then(() => console.log(`Connected ${username} to MongoDB`))
        .catch(err => {
            throw new Error("database connection " + err);
        });
}

export async function createUserInDB(user) {
    const newUser = new User(user);
    const userTable = await newUser.save();
    return userTable;
}

export async function userExists(email) {
    let error = false;
    const exists = await User
        .exists({ email: email })
        .catch(msg => {
            error = true;
            console.log("User balance find error: ", msg);
        });
    if (error) return -1;
    // const password = req.params.password;
    return exists;
}
