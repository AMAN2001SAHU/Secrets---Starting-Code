require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const encrypt = require("mongoose-encryption");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();

// console.log(process.env.API_KEY);
mongoose.set('strictQuery', true);

app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
// mongoose.set("strictQuery", true);


const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res)=> {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", (req, res)=> {
    res.render("login");
});

app.get("/register", (req, res)=> {
    res.render("register");
});

app.get("/logout", (req, res) => {
    req.logout( (err) => {
        if(err) {console.log(err); }
    });
    res.redirect("/");
});

app.get("/secrets", (req, res) => {

    User.find({"secrets" : {$ne: null}}, (err, foundUser) => {
        if(err) console.log(err);
        else {
            if(foundUser) {
                res.render("secrets", {userWithSecrets: foundUser});
            }
        }
    });


    // if(req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
});


app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    console.log(req.user._id);

    User.findById(req.user._id, (err, foundUser) => {
        if(err) console.log(err);
        else {
            if(foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
                
            }
        }
    });
});

app.post("/register", (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            })
        }
    })

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User ({
    //         email: req.body.username,
    //         password: hash
    //     });

    //     newUser.save( (err) => {
    //         if(err) console.log(err);
    //         else res.render("secrets");
    //     })
    // });
});

app.post("/login", (req, res) => {

    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if(err) {
            console.log(err);
            res.redirect("/login");
        }
        else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            })
        }
    })

    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({ email: username },
    //     function(err, foundUser) {
    //         if(err) console.log(err);
    //         else {
    //             if(foundUser) {
    //                 bcrypt.compare(password, foundUser.password, (err,result) => {
    //                     if(result === true) {
    //                         res.render("secrets");
    //                     }
    //                 })
    //             }
    //         }
    //     }
    // );
});


app.listen(3000, function(){
    console.log("Server started at port 3000.");
})
