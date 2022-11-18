/***************************************************
 * used for account info like balance, 
 * payment history, invoice history, request history,
 * transaction history etc.
 ***************************************************/
import { RESPONSE } from "../utils.js";
import express from "express";
import { MongoUser } from "../mongodb.js";
const router = express.Router();
// TODO: confirm if we need password info to do this.
// TODO: confirm what info to return
// Get from accounts/balance. Returns user account balance
router.get(
    '/balance/:email',
    async (req, res, next) => {
        console.log("Handling get user balance.");
        const email = req.params.email;
        let error = false;
        const user = await MongoUser
            .findOne({ email: email })
            .select({ balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Could not fetch user balance.`);
            });
        if (error) return next();
        // const password = req.params.password;
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(`Could not find user with email ${email}`);
            return next();
        }
        // const correctPass = user.password;
        // if (password != correctPass) {
        //     res.status(INVALID_AUTH).send(`Incorrect password.`);
        //     return;
        // }
        console.log(user);
        res.status(RESPONSE.OK).send(`Balance: ${user.balance}`);
        return next();
    }
);

export default router;