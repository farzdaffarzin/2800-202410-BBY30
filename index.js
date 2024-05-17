// Require necessary modules
require("./utils.js");
const express = require('express');
require('dotenv').config(); // Load environment variables from a .env file
const session = require('express-session'); // Session middleware
const MongoStore = require('connect-mongo'); // MongoDB session store
const bcrypt = require('bcrypt'); // Password hashing
const Joi = require('joi'); // Input validation
const saltRounds = 12; // Number of rounds for bcrypt hashing

const app = express(); // Create an instance of Express
const port = process.env.PORT || 4500; // Set the port to the value in environment variable or default to 4500

/* Secret information section - loaded from environment variables */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

// Include database connection (assuming `include` is defined in utils.js)
var { database } = include('databaseConnection');

// Access the users collection from the MongoDB database
const userCollection = database.db(mongodb_database).collection('users');

// Session expire time set to two days
const expireTime = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

// Create a MongoDB session store
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`, // MongoDB connection string
    crypto: {
        secret: mongodb_session_secret // Secret for encrypting session data
    }
});

// Use session middleware
app.use(session({
    secret: node_session_secret, // Secret for signing session ID cookies
    store: mongoStore, // Store sessions in MongoDB
    saveUninitialized: false, // Do not save uninitialized sessions
    resave: true // Resave session even if not modified
}));
// parse
app.use(express.urlencoded({extended: true}));


app.use(express.static('public'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Route for the home page
app.get("/", (req, res) => {
    res.render('index'); // Render the index.ejs view
});

// Route for the signup page
app.get("/signup", (req, res) => {
    res.render('signup'); // Render the signup.ejs view
});

// Route to handle user signup form submission
app.post('/submitUser', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;

    // Validate user input using Joi
    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required(),
        email: Joi.string().email().required()
    });

    const validationResult = schema.validate({ username, password, email });
    if (validationResult.error != null) {
        console.log(validationResult.error); // Log validation error
        res.redirect("/signup"); // Redirect to signup page if validation fails
        return;
    }

    // Hash the password using bcrypt
    var hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    await userCollection.insertOne({ username: username, password: hashedPassword, email: email, fridge: [] });
    
    // Set session variables
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime; // Set session expiration time
    
    console.log("Inserted user"); // Log user insertion
    res.redirect("/Home"); // Redirect to Home page
});

// Route for the login page
app.get('/login', (req, res) => {
    res.render('login'); // Render the login.ejs view
});

// Route to handle user login form submission
app.post('/loggingin', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    // Validate the email using Joi
    const schema = Joi.string().email().required();
    const validationResult = schema.validate(email);
    if (validationResult.error != null) {
        console.log(validationResult.error); // Log validation error
        res.redirect("/login"); // Redirect to login page if validation fails
        return;
    }

    // Find the user in the database by email
    const result = await userCollection.find({ email: email }).project({ email: 1, username: 1, password: 1, user_type: 1, _id: 1 }).toArray();

    console.log(result);
    if (result.length != 1) {
        res.redirect("/invalidPassword"); // Redirect to invalid password page if user not found
        return;
    }

    // Compare the password with the hashed password stored in the database
    if (await bcrypt.compare(password, result[0].password)) {
        console.log("correct password");
        // Set session variables
        req.session.authenticated = true;
        req.session.username = result[0].username;
        req.session.user_type = result[0].user_type;
        req.session.cookie.maxAge = expireTime; // Set session expiration time

        res.redirect('/loggedIn'); // Redirect to loggedIn page if password is correct
        return;
    } else {
        res.redirect("/invalidPassword"); // Redirect to invalid password page if password is incorrect
        return;
    }
});

// Route for invalid password page
app.get('/invalidPassword', (req, res) => {
    res.render('invalidPassword'); // Render the invalidPassword.ejs view
});

// Route for the loggedIn page
app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login'); // Redirect to login page if not authenticated
        return;
    }
    res.redirect('/Home'); // Redirect to members page if authenticated
});


// Route for the home page
app.get("/Home", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/'); // Redirect to home page if not authenticated
        return;
    } else {
        res.render('landingPage', {username: req.session.username}); // Render the Home.ejs view if authenticated
    }
});

// Route for handling 404 errors
app.get("*", (req, res) => {
    res.status(404).render('404'); // Render the 404.ejs view
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running on port ${port}`); // Log server start
});
