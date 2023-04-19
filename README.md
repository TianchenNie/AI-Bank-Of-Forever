**Project Description**  
The goal of this project is to build a financial bank back end to a conversational financial AI system, where the financial back end will be able to request funds from a user, confirm receipt of funds, and to transfer funds and/or payout from a user account.

The developed bank back end has been tested for reliability, security, and functionality.

**Installation**  
To install the project (both in development and LIVE environments), download this code, navigate to "AI-Bank-Of-Forever" and run 
```bash
npm install
```
To run the testing suites in development mode, `node 18` should be used. It is sufficient to use `node 16` when running in a _LIVE_ environment.

**Usage**  
To run the application in development mode, do
```bash
node index.js
```
or, for live updates, do
```bash
nodemon index.js
```

To run the application in a LIVE environment, be sure to set the LIVE environment variable
```bash
export LIVE=1
```
Then, to run the application on temporarily do
```bash
node index.js
```
To run the application continuously in a process management fashion, do
```bash
pm2 start index.js
```

**Description**  
See the description of essential files in the following table.
| File             | Description                                                         |
|:------------------:|---------------------------------------------------------------------|
| **index.js**       | Main entry point for the application, contains logic for setting up database connection, routers, and listens on a specified port.|
| **mongodb.js**     | Contains **database** logic defining table formats and providing utility to create a connection with the database. |
| **.env*** | Contains essential **environment variables** such as paypal client ID/Password, server url addresses, and database credentials. This will require updates when a new database/server/paypal account is to be used. |
| **utils.js** | Reads **.env** to set metedata (server url, database credentials, paypal credentials), and contains various **helper functions**. |
| **routes/account-info.js** | Handles **account-info** (balance, request history) retrievals.      |
| **routes/transfer.js***     | Handles **transfer** related requests (spend, internal transfer, external money request). Currently, everything is functional, but external money transfer needs a function to handle verifying paypal webhooks.               |
| **tests/*** | Contains unit tests that test the application for functionality even on heavy loads. Be sure to update server information when testing LIVE on an updated server. |


An **asterisk** * means there are potential updates needed in this file.
