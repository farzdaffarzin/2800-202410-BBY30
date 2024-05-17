// Require necessary modules
require("./utils.js");
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Load environment variables from a .env file
const axios = require('axios');
const session = require('express-session'); // Session middleware
const MongoStore = require('connect-mongo'); // MongoDB session store
const bcrypt = require('bcrypt'); // Password hashing
const Joi = require('joi'); // Input validation
const crypto = require('crypto'); // Random token generation
const nodemailer = require('nodemailer');// Email sending

const { getRecipesByIngredients } = require('./recipeGen'); // Import functions
const { ingredientSearch } = require('./ingredientApiSearch.js');
//dotenv.config({ path: path.join(__dirname, '.env') });

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
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
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
app.use(express.json());

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Route for the home page
app.get("/", (req, res) => {
    res.render('index'); // Render the index.ejs view
});

app.get('/prompt', (req,res) => {
    const fridgeData = [
        { name: 'chicken', quantity: 2, unit: 'breasts' },
        { name: 'broccoli', quantity: 1, unit: 'head' },
        { name: 'rice', quantity: 1, unit: 'cup' },
        // ... more ingredients
    ];
    res.render('prompt', {fridgeData});
})

// Route to fetch recipe details by ID
app.get('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const response = await axios.get(
            `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`
        );
        const recipeDetails = response.data;

        // Extract only necessary details (you can customize this)
        // const simplifiedDetails = {
        //     title: recipeDetails.title,
        //     image: recipeDetails.image,
        //     extendedIngredients: recipeDetails.extendedIngredients,
        //     instructions: recipeDetails.instructions,
        // };

        res.render('recipe', { recipe: recipeDetails }); 
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        res.status(500).json({ error: 'Failed to fetch recipe details' });
    }
});

// Route to handle recipe search by ingredients
app.post('/recipes', async (req, res) => {
    try {
        const ingredients = req.body.ingredients || ['chicken', 'broccoli', 'rice']; // Default ingredients if none provided

        const recipes = await getRecipesByIngredients(ingredients); // Pass axios instance
        // (Optional) Store recipes in MongoDB if needed...

        res.json(recipes);
    } catch (error) {
        // Error handling for different cases:
        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'No recipes found for the given ingredients' });
        } else if (error.response) { // Spoonacular API error
            res.status(error.response.status).json({ error: error.response.data });
        } else { // Other errors (e.g., network issues)
            res.status(500).json({ error: 'Failed to fetch recipes' });
        }
    }
});

// Route for home page
app.get("/fridge", async (req, res) => {
    res.render('fridge'); // Render fridge page
});

// Route for fetching user fridge data
app.post('/getUserFridge', async (req, res) => {
    try {
        const username = req.session.username;

        // Find user's fridge data from MongoDB
        const userFridgeData = await userCollection.findOne(
            { username: username },
            { projection: { _id: 0, username: 0, password: 0} } // Exclude username and password from projection
        );

        if (!userFridgeData) {
            return res.status(404).json({ error: 'User fridge data not found' });
        }

        // Return user data; only the fridge
        res.json(userFridgeData);
    } catch (error) {
        // Handle error if fetching fridge data fails
        console.error('Error fetching fridge data:', error);
        res.status(500).json({ error: 'Failed to fetch fridge data' });
    }
});

// Route for inserting an item into the user's fridge
app.post('/insertIntoFridge', async (req, res) => {
    try {
        const username = req.session.username;
        const userFridge = await userCollection.findOne({ username: username });

        // Check if the ingredients are provided and if it's an array
        let foodToInsert = req.body.ingredients;
        if (!foodToInsert) {
            return res.status(400).json({ error: 'Ingredients must be provided' });
        }

        if (!Array.isArray(foodToInsert)) {
            // Convert single object to array
            foodToInsert = [foodToInsert]; 
        }

        // Check if any of the ingredients already exist in the fridge
        for (const ingredient of foodToInsert) {
            if (userFridge && userFridge.fridge.some(item => item.id === ingredient.id)) {
                return res.json({ exists: true });
            }
        }

        // Update the user's fridge with the new ingredients
        const result = await userCollection.updateOne(
            { username: username },
            { $push: { fridge: { $each: foodToInsert } } }
        );

        if (!result) {
            return res.status(404).json({ error: 'User fridge data not found' });
        }

        res.json(result);
    } catch (err) {
        // Handle error if fetching fridge data fails
        console.error('Error updating fridge data:', err);
        res.status(500).json({ error: 'Failed to update fridge data' });
    }
});


// Route for ingredient search
app.post('/ingredients', async (req, res) => {
    try {
        // Extract ingredient to search from request body
        const ingredientToSearch = req.body.ingredient;
        if (!ingredientToSearch) {
            // Return error response if ingredient is not provided
            res.status(400).json({ error: 'Ingredient not provided in the request' });
            return;
        }

        // Search for ingredients using Spoonacular API
        const results = await ingredientSearch(ingredientToSearch, "calories");
        res.json(results); // Return search results
    } catch (err) {
        // Handle errors if ingredient search fails
        if (err.response && err.response.status === 404) {
            res.status(404).json({ error: 'No ingredients found' });
            return;
        } 

        if (err.response) {
            res.status(err.response.status).json({ error: err.response.data });
            return;
        } 
        res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
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

// Create a transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'farzadf8713@gmail.com',
        pass: 'dkwrnvgfwghskxnu'
    }
});

function createResetToken() {
    return crypto.randomBytes(20).toString('hex');
}

async function sendResetEmail(email, link) {
    const mailOptions = {
        from: 'pantry.pal2024@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `You requested for a password reset. Click the following link to reset your password: ${link}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Reset password email sent.');
    } catch (error) {
        console.error('Error sending reset email:', error);
    }
}

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
});

// Route to handle sending the password reset email
app.post('/send-password-reset', async (req, res) => {
    const { email } = req.body;
    const user = await userCollection.findOne({ email: email });
    if (!user) {
        res.status(400).send('No account with that email address exists.');
    } else {
        const resetToken = createResetToken();
        const resetLink = `http://${req.headers.host}/reset-password?token=${resetToken}`;
        await sendResetEmail(email, resetLink);

        // Store the token in the database with an expiry
        const expireTime = new Date(Date.now() + 3600000); // 1 hour from now
        await userCollection.updateOne({ email: email }, { $set: { resetToken: resetToken, resetTokenExpires: expireTime } });

        res.send({ message: 'A password reset link has been sent to your email.' });
    }
});


// Route to serve the Reset Password form
app.get('/reset-password', (req, res) => {
    res.render('reset-password', { token: req.query.token });
});

// Route to handle the password reset form submission
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    const user = await userCollection.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: new Date() } // Checks if the token is not expired
    });

    if (!user) {
        return res.status(400).send('Invalid or expired token.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await userCollection.updateOne({ _id: user._id }, { $set: { password: hashedPassword, resetToken: null, resetTokenExpires: null } });
    res.send('Your password has been updated. <a href="/login">back to Login</a>');
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
