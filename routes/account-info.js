/***************************************************
 * used for account info like balance, 
 * payment history, invoice history, request history,
 * transaction history etc.
 ***************************************************/
import { SECRET, RESPONSE } from "../utils.js";
import express from "express";
import { MongoUser } from "../mongodb.js";
import md5 from "blueimp-md5";

const router = express.Router();
// Get from accounts/balance. Returns user account balance
router.get(
    '/balance/:email/:password',
    async (req, res, next) => {
        console.log("Handling get user balance.");
        const email = req.params.email;
        const password = req.params.password;
        let error = false;
        const user = await MongoUser
            .findOne({ email: email })
            .select({ password: 1, balance: 1 })
            .catch(msg => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });
        if (error) return next();
        // const password = req.params.password;
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(`User does not exits.`);
            return next();
        }
        // const correctPass = user.password;
        // if (password != correctPass) {
        //     res.status(INVALID_AUTH).send(`Incorrect password.`);
        //     return;
        // }
        if (user.password != md5(password, SECRET)) {
            res.status(RESPONSE.INVALID_AUTH).send(`Wrong password.`);
            return next();
        }
        res.status(RESPONSE.OK).send(`Balance: ${user.balance}`);
        return next();
    }
);

export default router;