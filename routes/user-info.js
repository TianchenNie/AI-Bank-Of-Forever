/***************************************************
 * used for user info like password, 
 * address, cellphone, email, create new user etc.
 ***************************************************/
import { RESPONSE, isValidEmail } from "../utils.js";
import { MongoUser, createUserInDB } from "../mongodb.js";
import express from "express";

// used for user info like password, address, cellphone, email, create new user etc.

// handle all routes under /api/user-info
const router = express.Router();
// PUT to user-info. Create a new user.
// Idempotent as in duplicate users are not allowed to be created.
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
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send("User lookup failed.");
            });

        if (error) return next();
        if (userExists) {
            res.status(RESPONSE.BAD_REQUEST).send(`User account with email ${email} already exists.`);
            return next();
        }

        // create new user and insert into database
        const newUser = {
            email: email,
            password: password,
            balance: 0.00,
        };

        const userTable = await createUserInDB(newUser)
            .catch(err => {
                error = true;
                console.error("User creation error: ", err);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send("Could not create user.");
            });

        if (error) return next();
        console.log("Created user: ", userTable);
        res.status(RESPONSE.OK).send(newUser);
        return next();
    }
);


// TODO: confirm if we want to do this.
// Get from user-info/password. Returns user password
router.get(
    '/password/:email',
    async (req, res, next) => {
        const email = req.params.email;
        if (!isValidEmail(email)) {
            res.status(RESPONSE.BAD_REQUEST).send(`Please enter a valid email.`);
            return next();
        }
        let error = false;
        const user = await MongoUser
            .findOne({ "email": email })
            .select({ "password": 1 })
            .catch(err => {
                error = true;
                console.log("Get user password error: ", err);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send("Could not get user password.");
            });

        if (error) return next();

        console.log(user);
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(`Could not find user with email ${email}`);
            return next();
        }
        res.status(RESPONSE.OK).send(`Password: ${user.password}`);
        return next();
    }
);

// Put to user-info/password. 
// Update an existing users password.
// TODO: confirm if security checks (login) will be done at front end
router.put(
    "/password/:email/:newPassword",
    async (req, res, next) => {
        console.log("Handling update user password.");
        const email = req.params.email;
        const newPassword = req.params.newPassword;
        if (!isValidEmail(email)) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
            return next();
        }
        // TODO: ask then add logic to check if password is valid
        else if (!newPassword) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
            return next();
        }
        let error = false;
        const user = await MongoUser
            .findOneAndUpdate({ email: email }, { password: newPassword })
            .catch(msg => {
                error = true;
                console.log("User password update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Could not update password`);
            });

        if (error) return next();

        console.log(user);
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(`Could not find user with email ${email}`);
            return next();
        }
        // update password to new password
        res.status(RESPONSE.OK).send(`Updated password to: ${newPassword}`);
        return next();
    }
);

export default router;