const express = require('express');
const PORT = 3000;
const app = express();

app.get('/hello', (req, res, next) => {
    res.send("Welcome")
})

app.listen(PORT, () => {
    console.log("server is running a t port 3000")
})