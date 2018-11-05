const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const BankIDStrategy = require("passport-bankid").Strategy;

passport.use(
  new BankIDStrategy(
    {
      ca: fs.readFileSync("./resources/test-bankid-root-CA.pem"),
      pfx: fs.readFileSync("./resources/FPTestcert2_20150818_102329.pfx"),
      passphrase: "qwerty123"
    },
    (user, done) => {
      console.log("bankid user data: ", user);
      done(null, user);
    }
  )
);

const app = express();
app.use(passport.initialize());

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get("/", (req, res) => res.send("redirect after login bankid OK!"));

app.post(
  "/login",
  passport.authenticate("bankid", { session: false }),
  (req, res) => {
    console.log("auth succeed!!");
    res.redirect("/");
  }
);

const port = 5000;
app.listen(5000, () => console.log(`start server on ${port}`));
