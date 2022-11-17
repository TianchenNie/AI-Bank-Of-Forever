import { users } from "./data.js";
import { RESPONSE } from "./utils.js";

export function initAccountInfoEndpoint(app) {
    // TODO: confirm if we need password info to do this.
    // TODO: confirm what info to return
    // Get from accounts/balance. Returns user account balance
    app.get(
        '/api/account-info/balance/:email',
        (req, res) => {
            const email = req.params.email;
            // const password = req.params.password;
            const user = users[email];
            if (!user) {
                res.status(RESPONSE.NOT_FOUND).send(`Couldn't find user with email ${email}`);
                return;
            }
            // const correctPass = user.password;
            // if (password != correctPass) {
            //     res.status(INVALID_AUTH).send(`Incorrect password.`);
            //     return;
            // }
            res.status(RESPONSE.OK).send(`Balance: ${user.balance}`);
        }
    );
}