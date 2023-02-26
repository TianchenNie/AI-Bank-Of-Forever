/***************************************************
 * used for account info like balance, 
 * payment history, invoice history, request history,
 * transaction history etc.
 ***************************************************/
import { parseUserRequestHistory, SECRET, RESPONSE, generateError } from "../utils.js";
import express from "express";
import { User } from "../mongodb.js";
import md5 from "blueimp-md5";

const router = express.Router();
// Get from accounts/balance. Returns user account balance
router.get(
    '/balance/:email/:password',
    async (req, res, next) => {
        const email = req.params.email;
        const password = req.params.password;
        let error = false;
        const user = await User
            .findOne({ email: email })
            .select({ password: 1, balance: 1 })
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(generateError(err));
            });
        if (error) return next();
        // const password = req.params.password;
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(generateError(`Un-identified user email.`));
            return next();
        }
        if (user.password != md5(password, SECRET)) {
            res.status(RESPONSE.INVALID_AUTH).send(generateError("Incorrect user password."));
            return next();
        }
        const response = {
            balance: user.balance.toString()
        };
        res.status(RESPONSE.OK).send(JSON.stringify(response, null, 2));
        return next();
    }
);

/* TODO: maybe set limit ob how many request history entries to retrieve */
router.get(
    '/request-history/:email/:password',
    async (req, res, next) => {
        const email = req.params.email;
        const password = req.params.password;
        let error = false;
        const user = await User
            .findOne({ email: email })
            .select({ password: 1, moneyRequestHistory: 1 })
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(generateError(err));
            });
        if (error) return next();
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(generateError(`Un-identified user email.`));
            return next();
        }
        if (user.password != md5(password, SECRET)) {
            res.status(RESPONSE.INVALID_AUTH).send(generateError("Incorrect user password."));
            return next();
        }
        const parsedHistory = parseUserRequestHistory(user);
        res.status(RESPONSE.OK).send(JSON.stringify(parsedHistory, null, 2));
        return next();
    }
);


export default router;