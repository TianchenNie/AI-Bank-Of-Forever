import fetch from "node-fetch"
fetch("ec2-18-117-140-41.us-east-2.compute.amazonaws.com:8080/api/user-info")
    .then((response) => response.json())
    .then((data) => console.log(data));