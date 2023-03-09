// TODO: confirm if we want to do this.
// Get from user-info/password. Returns user password
router.get(
    '/password/:email',
    async (req, res, next) => {
        const email = req.params.email;
        if (!isValidEmailFormat(email)) {
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
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
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

// Remove a user
router.put(
    '/remove/:email',
    async (req, res, next) => {
        console.log("Handling create new user.");
        const email = req.params.email;

        // check if parameters are valid
        if (!email || !isValidEmailFormat(email)) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
            return next();
        }

        // check if user already exists in database
        let error = false;

        const ret = await MongoUser
            .findOneAndDelete({ email: email })
            .catch(msg => {
                error = true;
                console.log("Find error in remove user: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (ret == null) {
            res.status(RESPONSE.NOT_FOUND).send(`User to be removed with email ${email} does not exists.`);
            return next();
        }
        res.status(RESPONSE.OK).send(ret);
        return next();
    }
);

// Put to user-info/password. 
// Update an existing users password.
router.put(
    "/update-password/:email/:oldPassword/:newPassword",
    async (req, res, next) => {
        const email = req.params.email;
        const oldPassword = req.params.oldPassword;
        const newPassword = req.params.newPassword;
        if (!isValidEmailFormat(email)) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
            return next();
        }
        else if (!newPassword) {
            res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
            return next();
        }
        let error = false;
        const user = await User
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

// payment_source: {
//     paypal: {
//         experience_context: {
//             payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
//             shipping_preference: "NO_SHIPPING",
//             payment_method_selected: "PAYPAL",
//             landing_page: "LOGIN",
//             user_action: "PAY_NOW",
//             return_url: `http://localhost:8080/api/transfer/external/capture-request/${uniqueId}`,
//         }
//     }
// },

async function capturePayment(captureUrl) {
    let error = false;
    // const url = `${base}/v2/checkout/orders/${orderId}/capture`;
    const response = await fetch(captureUrl, {
        method: "post",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
    })
        .catch(err => {
            error = true;
            console.error("Error while fetching capturePayment " + err);
        });
    if (error) return null;
    const data = await response.json();
    return data;
}

async function getOrderDetails(orderId) {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const response = await paypalClient.execute(request);
    return response.result;
}

router.get(
    "/external/capture-request/:email/:uniqueId",
    async (req, res, next) => {
    //     console.log("Capturing request.");
    //     let error = false;
    //     const email = req.params.email;
    //     const uniqueId = req.params.uniqueId;
    //     if (!uuid.validate(uniqueId)) {
    //         res.status(RESPONSE.INVALID_AUTH).send("Invalid Order Unique Id.");
    //         return next();
    //     }
    //     const user = await User
    //         .findOne({ email: email })
    //         .select({ moneyRequestHistory: 1, balance: 1 })
    //         .catch(err => {
    //             error = true;
    //             req.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
    //         });

    //     if (error) return next();
    //     if (!user) {
    //         req.status(RESPONSE.NOT_FOUND).send("User not found.");
    //         return next();
    //     }
    //     const order = user.moneyRequestHistory.find((request) => request.serverId == uniqueId);
    //     if (!order) {
    //         res.status(RESPONSE.NOT_FOUND).send("Order not found.");
    //         return next();
    //     }
    //     if (order.status != requestStatus.PENDING_APPROV) {
    //         res.status(RESPONSE.CONFLICT).send("Order already captured.");
    //         return next();
    //     }
    //     const captureRes = await (capturePayment(order.captureUrl, accessToken));
    //     console.log("Capture Payment Response: ", JSON.stringify(captureRes, null, 2));
        
	// if (captureRes == null) {
    //         req.status(RESPONSE.INTERNAL_SERVER_ERR).send();
    //         return next();
    //     }

    //     // TODO: may need to synchronize for multiple, parallel captures.
    //     order.status = requestStatus.CAPTURED;
    //     // order.amount = order.amount.toString();
    //     order.timeCaptured = Date.now();
    //     await User
    //         .findOneAndUpdate({ email: email }, {
    //             moneyRequestHistory: user.moneyRequestHistory,
    //             $inc: { balance: order.amount }
    //         })
    //         .catch(err => {
    //             error = true;
    //             req.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
    //         });

    //     if (error) return next();
  
        res.status(RESPONSE.OK).send("Transfer Success.");
        return next();
    }
);