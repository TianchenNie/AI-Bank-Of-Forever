import { RESPONSE, isValidEmail } from "./utils.js";
import { users } from "./data.js";

export function initUserInfoEndpoint(app) {
    // PUT to user-info. Create a new user.
    // Idempotent as in duplicate users are not allowed to be created.
    app.put(
        '/api/user-info/:email/:password',
        (req, res) => {
            const email = req.params.email;
            const password = req.params.password;
            // console.log("EMAIL: ", email);
            if (!email || !isValidEmail(email)) {
                res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid email.");
                return;
            }
            else if (!password) {
                res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
                return;
            }
            else if (users[email]) {
                res.status(RESPONSE.BAD_REQUEST).send("User already exists.");
                return;
            }
            users[email] = {
                password: password,
                balance: 0
            };
            const responseObj = {};
            responseObj[email] = users[email];
            res.status(RESPONSE.OK).send(responseObj);
            console.log(users);
        }
    );

    // TODO: confirm if we want to do this.
    // Get from user-info. Returns user password
    app.get(
        '/api/user-info/password/:email',
        (req, res) => {
            const email = req.params.email;
            const user = users[email];
            if (!user) {
                res.status(RESPONSE.NOT_FOUND).send(`Couldn't find user with email ${email}`);
                return;
            }
            res.status(RESPONSE.OK).send(`Password: ${user.password}`);
        }
    );

    // Put to user-info. 
    // Update an existing users password.
    // TODO: confirm if security checks (login) will be done at front end
    app.put(
        "/api/user-info/password/:email/:newPassword",
        (req, res) => {
            const email = req.params.email;
            const newPassword = req.params.newPassword;
            if (!email || !users[email]) {
                res.status(RESPONSE.NOT_FOUND).send("Could not find user.");
                return;
            }
            else if (!newPassword) {
                res.status(RESPONSE.BAD_REQUEST).send("Please enter a valid password.");
                return;
            }
            // update password to new password
            users[email].password = newPassword;
            res.status(RESPONSE.OK).send(`Updated password to: ${newPassword}`);
            console.log(users);
        }
    );
}