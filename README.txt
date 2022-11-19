TODO list:
- external request of money
- external spend of money
- check password format
- check if we need password authentication when operating (remove user, transfer money, get balance, set password etc.)
    - The reason we think we don't need authentication is because the user should be logged in on the frontend anyway,
    and the frontend talks with the API not the user so the frontend can handle authentication issues.
- check what additional user/account fields we need (like address, cellphone, transaction history) and what operations to
be performed on them.
