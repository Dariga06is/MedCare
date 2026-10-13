import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("TEST OK");
});

app.listen(3000, () => {
    console.log("TEST SERVER STARTED");
    console.log("http://localhost:3000");
});