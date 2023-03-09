/***************************************************
 * API 1 and 3
 * used to handle internal and external transactions.
 * sandbox account: sb-p6tox23893932@personal.example.com
 * sandbox password: "8e9aU?p
 ***************************************************/
import fetch from "node-fetch";
import {
    PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, RESPONSE, SERVER_BASE_URL,
    isValidMoneyAmount, isValidRequestAmount, generateError, isValidEmailFormat,
    createOrderObject
} from "../utils.js";
import * as uuid from "uuid";
import paypal from "@paypal/checkout-server-sdk";
import { User, dbClient } from "../mongodb.js";
import express from "express";
import bcrypt from "bcrypt";
import qs from "qs";
import crypto from "crypto";

const router = express.Router();

// TODO: update SandboxEnvironment after we go live.
const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET));

// TODO: update after go live, this link is for sandbox environment.
const base = "https://api.sandbox.paypal.com";

const requestStatus = Object.freeze({
    PENDING_APPROV: "pending-approval",
    CAPTURED: "captured-by-server",
});
// get access token
// Note need to recall as access tokens can expire.
// Handle 401 no auth from paypal.
async function getAccessToken() {
    let accessToken = "";
    const authUrl = "https://api-m.sandbox.paypal.com/v1/oauth2/token";
    const clientIdAndSecret = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`;
    const base64 = Buffer.from(clientIdAndSecret).toString('base64');
    await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Authorization': `Basic ${base64}`,
        },
        body: 'grant_type=client_credentials'
    })
        .then(response => response.json())
        .then(data => {
            accessToken = data.access_token;
        })
        .catch(err => console.error("Couldn't get auth token with err: " + err));

    return accessToken;
};

let accessToken = await getAccessToken();
console.log("Got Access Token:", accessToken);

async function verifyWebhookSignature(headers, payload) {
    const url = "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature";
    const webHookId = "9US32710Y7947011C";
    // console.log("HEADERS: ", headers);
    const algo = headers['paypal-auth-algo'];
    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    const transmissionSig = headers['paypal-transmission-sig'];

    const reqBody = {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: algo,
        transmission_sig: transmissionSig,
        webhook_id: webHookId,
        webhook_event: payload
    }

    console.log("REQ BODY: ");
    console.log(JSON.stringify(reqBody, null, 2));

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: reqBody
    })
    .catch(err => {
        console.error(err);
    });
    return response;

}

// Flow: receive request from frontend, create request and return redirect link to user
// user navigates to link and approves, frontend calls capture of backend,
// capture then updates user balnces.
// https://developer.paypal.com/docs/checkout/standard/integrate/
// https://developer.paypal.com/docs/api/orders/v2/#error-ORDER_NOT_APPROVED
router.post(
    "/external/create-request",
    async (req, res, next) => {
        let uniqueId;
        let error = false;
        const requestorEmail = req.body.email;
        const requestorPassword = req.body.password;
        const moneyAmount = req.body.amount;
        if (!isValidRequestAmount(moneyAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send("Amount to request is invalid. Must be less than or equal to 9999999.99.");
            return next();
        }

        const dataBaseRequestor = await User
            .findOne({ email: requestorEmail })
            .select({ password: 1 })
            .catch(msg => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        if (dataBaseRequestor == null) {
            req.status(RESPONSE.NOT_FOUND).send("User not found.");
            return next();
        }

        if (!bcrypt.compareSync(requestorPassword, dataBaseRequestor.password)) {
            req.status(RESPONSE.INVALID_AUTH).send("Invalid password");
            return next();
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody(createOrderObject(requestorEmail, parseFloat(moneyAmount)));
        // console.log("Return url: " + `${SERVER_BASE_URL}/api/transfer/external/capture-request/${requestorEmail}/${uniqueId}`);
        const order = await paypalClient
            .execute(request)
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });
        // console.log("ORDER: ", order);
        if (error) return next();
        const orderId = order.result.id;
        const captureLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "capture");
        const viewLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "self");
        const approveLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "approve");
        if (!captureLinkObj || !viewLinkObj || !approveLinkObj) {
            res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            console.log("Unexpected capture/view/approve link.");
            return next();
        }

        const newMoneyRequest = {
            serverId: uniqueId,
            orderId: orderId,
            status: requestStatus.PENDING_APPROV,
            amount: moneyAmount,
            captureUrl: captureLinkObj.href,
            viewUrl: viewLinkObj.href,
            approveUrl: approveLinkObj.href,
            timeCreated: Date.now(),
            timeCaptured: null,
        };

        await User
            .updateOne({ email: requestorEmail }, {
                $push: { moneyRequestHistory: newMoneyRequest }
            })
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });

        if (error) return next();
        res.status(RESPONSE.OK).send({
            href: approveLinkObj.href,
        });
        return next();
    }
);

router.get(
    "/external/order-completion-page",
    (req, res, next) => {
        res.status(RESPONSE.OK).send("Transfer Success.");
        return next();
    }
);

async function captureOrder(orderId) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    try {
        // Call API with your client and get a response for your call
        const response = await paypalClient.execute(request);
        return response.result["purchase_units"][0]["payments"]["captures"][0]["seller_receivable_breakdown"]["net_amount"]["value"];
    }
    catch (error){
        console.error(error);
        return -1;
    }
}

router.post(
    "/external/paypal/webhooks/order-complete",
    async (req, res, next) => {
        const payload = req.body;
        const isVerified = await verifyWebhookSignature(req.headers, payload);
        if (typeof isVerified == "boolean"){
            console.log("IS VERIFIED: ", isVerified);
        }
        if (payload.event_type === "CHECKOUT.ORDER.APPROVED") {
            const orderId = payload.resource.id;
            const amountRequestedAfterTax = await captureOrder(orderId);
            if (amountRequestedAfterTax == -1) {
                res.status(RESPONSE.BAD_REQUEST).send();
                return next();
            }
            const userEmail = payload.resource.purchase_units[0].custom_id;
            console.log("GOT CUSTOM ID: ", userEmail);
            if (!isValidEmailFormat(userEmail)) {
                console.error(`Invalid custom ID: ${userEmail}`);
                res.status(RESPONSE.BAD_REQUEST).send();
                return next();
            }

            /* update the user balance if we find an array element elem that has a matching orderId */
            /* set the time captured of that element to the current time */
            const updatedUser = await User
                .findOneAndUpdate(
                    { email: userEmail },
                    [
                        {
                            $inc: {
                                balance: {
                                    $cond: {
                                        if: {
                                            $and: [
                                                { $eq: [ "$$orderElem.orderId", orderId ] },
                                                { $eq: [ "$$orderElem.timeCaptured", null ]}
                                            ]
                                            // moneyRequestHistory: {
                                            //     $elemMatch: { orderId: orderId, timeCaptured: null }
                                            // }
                                        },
                                        then: amountRequestedAfterTax,
                                        else: "0",
                                    }
                                }
                            }
                        },
                        { $set: { "moneyRequestHistory.$[orderElem].timeCaptured": Date.now() } },
                    ],
                    {
                        arrayFilters: [
                            {
                                "orderElem.orderId": orderId,
                                "orderElem.timeCaptured": null
                            }
                        ]
                    },
                    { new: true }
                );
            console.log("Updated User: ", updatedUser);

            res.status(RESPONSE.OK).send();
        }
        
        // console.log("Received web hook!!!");
        // console.log(req.body);
        res.status(RESPONSE.BAD_REQUEST).send();
        return next();
    }
);


// When a user spends money externally, it goes through the front end and the balance
// of the master account gets deducted.
// The frontend further queries the API to deduct the balance of the user that spent the money.
router.post(
    "/spend",
    async (req, res, next) => {
        const userEmail = req.body.email;
        /* spendAmount should be a string */
        const spendAmount = req.body.amount;
        const password = req.body.password;
        let error = false;
        if (!isValidEmailFormat(userEmail)) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid user email format."));
            return next();
        }
        if (!isValidMoneyAmount(spendAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid amount to spend."));
            return next();
        }

        /* try to find a user with the entered email */
        const user = await User.findOne({ email: userEmail });

        /* check if the user exists and the password is correct */
        if (user == null) {
            res.status(RESPONSE.NOT_FOUND).send(generateError(`Could not find user with email ${userEmail}.`));
            return next();
        }

        const hashedPassword = user.password;
        if (!bcrypt.compareSync(password, hashedPassword)) {
            res.status(RESPONSE.INVALID_AUTH).send(generateError("Incorrect user password."));
            return next();
        }

        /* update the user balance with negative spend amount. */
        const updatedUser = await User
            .findOneAndUpdate({ email: userEmail, password: hashedPassword, balance: { $gte: spendAmount } },
                { $inc: { balance: "-" + spendAmount } },
                { new: true }
            )
            .catch(msg => {
                error = true;
                console.log("Internal spend update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        /*  if updatedUser is null, then likely the user had insufficient funds.
            However, with very small probability, the user could have changed their password between
            findOne and findOneAndUpdate */
        if (updatedUser == null) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid credentials or insufficient funds."));
            return next();
        }

        /* send the new user balance as response. */
        res.status(RESPONSE.OK).send({
            balance: updatedUser.balance.toString()
        });
        return next();
    }
);


// Perform internal transfer.
router.post(
    "/internal",
    async (req, res, next) => {
        // console.log("Handling internal transfer with write concern: ", dbClient.writeConcern);

        const sender = req.body.sender;
        const receiver = req.body.receiver;
        const senderPassword = req.body.senderPassword;
        const moneyAmount = req.body.amount;
        // console.log("BODY: ", req.body);
        if (!isValidEmailFormat(sender)) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid sender email format."));
            return next();
        }
        if (!isValidEmailFormat(receiver)) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid receiver email format."));
            return next();
        }
        if (!isValidMoneyAmount(moneyAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Amount to transfer is invalid."));
            return next();
        }
        if (typeof senderPassword != "string") {
            res.status(RESPONSE.BAD_REQUEST).send(generateError("Invalid sender password format."));
            return next();
        }
        let error = false;

        /* check if receiver exists */
        const receiveUser = await User
            .findOne({ email: receiver })
            .catch(msg => {
                error = true;
                // console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        if (receiveUser == null) {
            res.status(RESPONSE.NOT_FOUND).send(generateError(`Could not find receiver with email ${receiver}.`));
            return next();
        }

        const session = await dbClient.startSession();
        await session.startTransaction();
        try {
            const sendUser = await User.findOne( { email: sender }, null, { session: session });
            if (sendUser == null) {
                await session.abortTransaction();
                await session.endSession();
                res.status(RESPONSE.NOT_FOUND).send(generateError(`Could not find sender with email ${sender}.`));
                return next();
            }

            const hashedPassword = sendUser.password;
            if (!bcrypt.compareSync(senderPassword, hashedPassword)) {
                await session.abortTransaction();
                await session.endSession();
                res.status(RESPONSE.INVALID_AUTH).send(generateError("Incorrect sender password."));
                return next();
            }
            const sendUserUpdated = await User
                .findOneAndUpdate({ email: sender, password: hashedPassword, balance: { $gte: moneyAmount } },
                    { $inc: { balance: "-" + moneyAmount } },
                    { session: session, new: true }
                );
            // console.log("Finished updating sender");
            if (sendUserUpdated == null) {
                await session.abortTransaction();
                await session.endSession();
                res.status(RESPONSE.NOT_FOUND).send(generateError("Insufficient funds in sender account."));
                return next();
            }

            const receiveUserUpdated = await User
                .findOneAndUpdate({ email: receiver },
                    { $inc: { balance: moneyAmount } },
                    { session: session, new: true }
                );
            // console.log("Finished updating receiver");

            await session.commitTransaction();
            await session.endSession();
            res.status(RESPONSE.OK).send({
                senderBalance: sendUserUpdated.balance.toString(),
                receiverBalance: receiveUserUpdated.balance.toString()
            });
            return next();

        }
        catch (error) {
            console.error("Error: ", error);
            await session.abortTransaction();
            await session.endSession();
            res.status(RESPONSE.INTERNAL_SERVER_ERR).send(generateError(error));
            return next();
        }
    }
);

export default router;
