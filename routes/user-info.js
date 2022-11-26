/***************************************************
 * used for user info like password, 
 * address, cellphone, email, create new user etc.
 ***************************************************/
import { RESPONSE, isValidEmail, SECRET } from "../utils.js";
import { MongoUser, createUserInDB } from "../mongodb.js";
import express from "express";
import md5 from "blueimp-md5";

// used for user info like password, address, cellphone, email, create new user etc.

// handle all routes under /api/user-info
const router = express.Router();

router.get(
    '',
    async (req, res, next) => {
        let error = false;
        console.log("Fetching all users.");
        let users = await MongoUser
            .find({})
            .catch(err => {
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        res.status(RESPONSE.OK).send(users);
        return next();
    }
);

// PUT to user-info. Create a new user.
// Idempotent as in duplicate users are not allowed to be created.
// used for testing purposes
router.put(
    '/new/:email/:password',
    async (req, res, next) => {
        console.log("Handling create new user.");
        const email = req.params.email;
        const password = req.params.password;

        // check if parameters are valid
        if (!email || !isValidEmail(email)) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
            return next();
        }
        // TODO: ask professor what password format he wants
        else if (!password) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
            return next();
        }

        // check if user already exists in database
        let error = false;
        const userExists = await MongoUser
            .exists({ "email": email })
            .catch(msg => {
                error = true;
                console.log("User find error in user-info put: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        if (userExists) {
            res.status(RESPONSE.CONFLICT).send(`User account with email ${email} already exists.`);
            return next();
        }

        // create new user and insert into database
        const newUser = {
            email: email,
            password: md5(password, SECRET),
            balance: 0.00,
        };

        const userTable = await createUserInDB(newUser)
            .catch(err => {
                error = true;
                console.error("User creation error: ", err);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        console.log("Created user: ", userTable);
        res.status(RESPONSE.CREATED).send(newUser);
        return next();
    }
);

// Put to user-info/password. 
// Update an existing users password.
router.put(
    "/update-password/:email/:oldPassword/:newPassword",
    async (req, res, next) => {
        console.log("Handling update user password.");
        const email = req.params.email;
        const oldPassword = req.params.oldPassword;
        const newPassword = req.params.newPassword;
        if (!isValidEmail(email)) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
            return next();
        }
        else if (!newPassword) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
            return next();
        }
        let error = false;
        const user = await MongoUser
            .findOneAndUpdate({ email: email, password: md5(oldPassword, SECRET) }, { password: md5(newPassword, SECRET) })
            .catch(msg => {
                error = true;
                console.log("User password update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        console.log(user);
        if (user == null) {
            res.status(RESPONSE.INVALID_AUTH).send(`Invalid email or old password.`);
            return next();
        }
        // update password to new password
        res.status(RESPONSE.OK).send(`Updated password to: ${newPassword}`);
        return next();
    }
);

export default router;