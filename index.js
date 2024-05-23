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


const { MongoClient, ObjectId } = require('mongodb'); 
const { getRecipesByIngredients } = require('./recipeGen'); // Import functions
const { ingredientSearch } = require('./ingredientApiSearch.js');
const { connectToDatabase, getClient } = require('./databaseConnection');
const User = require('./userModel.js');

const saltRounds = 12; // Number of rounds for bcrypt hashing

const app = express(); // Create an instance of Express
const port = process.env.PORT || 4500; // Set the port to the value in environment variable or default to 4500
app.use(express.json());
/* Secret information section - loaded from environment variables */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;//const favicon = require('serve-favicon');//for favicon

const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
/* END secret section */

// Access the users collection from the MongoDB database
let userCollection; // Define a variable to store the user collection

// Create a MongoDB session store
var mongoStore;

// Connect to the MongoDB Atlas cluster
connectToDatabase().then(() => {
    // Initialize the userCollection and mongoStore after connecting to the database
    const client = getClient();
    const database = client.db(process.env.MONGODB_DATABASE);
    userCollection = database.collection('users');
    mongoStore = MongoStore.create({
        client: client,
        crypto: {
            secret: mongodb_session_secret // Secret for encrypting session data
        }
    });

    // Start the server and listen on the specified port
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`); // Log server start
    });
}).catch(error => {
    console.error("Failed to connect to MongoDB Atlas:", error);
    process.exit(1); // Exit the process with a non-zero exit code
});

// Use session middleware
app.use(session({
    secret: node_session_secret, // Secret for signing session ID cookies
    store: mongoStore, // Store sessions in MongoDB
    saveUninitialized: false, // Do not save uninitialized sessions
    resave: true // Resave session even if not modified
}));

// Parse
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(express.json());

// Set session expiration time
const expireTime = 60 * 60 * 1000; // 1 hour in milliseconds

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Route for the home page
app.get("/", (req, res) => {
    res.render('index'); // Render the index.ejs view
});

app.get('/prompt', async (req, res) => {
    // const fridgeData = [
    //     { name: 'chicken', quantity: 2, unit: 'breasts' },
    //     { name: 'broccoli', quantity: 1, unit: 'head' },
    //     { name: 'rice', quantity: 1, unit: 'cup' },
    //     // ... more ingredients
    // ];
    const username = req.session.username;

    const user = await userCollection.findOne(
        { username: username },
        { projection: { _id: 0, username: 0, password: 0, email: 0 } } 
    );
    const fridgeData = user.fridge;
    if (!fridgeData) {
        return res.status(404).json({ error: 'User fridge data not found' });
    }
    res.render('prompt', { fridgeData });
})

// Route to fetch recipe details by ID
app.get('/recipe/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const userId = req.session.userId;
        const response = await axios.get(
            `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`
        );
        const recipeDetails = response.data;

        const ingredients = recipeDetails.extendedIngredients;
        const username = req.session.username;
        const user = await userCollection.findOne(
            { username: username },
            { projection: { _id: 0, username: 0, password: 0, email: 0 } } 
        );
        
        const fridgeData = user.fridge;
        const shoppingListData = user.shoppingList;
        const missingIngredients = [];
        ingredients.forEach(element => {
            
            // Check if the ingredient is in the user's fridge or shopping list
            const existsInFridge = fridgeData.some(fridgeItem => fridgeItem.id === element.id);
            const existsInShoppingList = shoppingListData.some(shoppingListItem => shoppingListItem.id == element.id);

            if (!existsInFridge && !existsInShoppingList) {
                // Format of ingredients to push to shopping list
                missingIngredients.push({ 
                    id: element.id, 
                    name: element.name
                });
            }
        });

        res.render('recipe', { recipe: recipeDetails, missingIngredients: missingIngredients }); 
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        res.status(500).json({ error: 'Failed to fetch recipe details' });
    }
});

// Route to handle recipe search by ingredients
app.post('/recipes', async (req, res) => {
    try {
        const ingredients = req.body.ingredients || ['chicken', 'broccoli', 'rice']; // Default ingredients if none provided
        const cuisine = req.body.cuisine;
        const recipes = await getRecipesByIngredients(ingredients, cuisine); // Pass axios instance
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

// Route to add items to users' shopping list
app.post('/addToShoppingList', async (req, res) => {
    console.log(req.body.ingredientId, req.body.ingredientName);
    const ingredientId = parseInt(req.body.ingredientId, 10);
    const ingredientName = req.body.ingredientName;
    const username = req.session.username;

    const user = await userCollection.findOne({ username: username });

    if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
    }

    const ingredient = {
        id: ingredientId,
        name: ingredientName
    };

    try {
        const result = await userCollection.updateOne(
            { username: username },
            { $push: { shoppingList: ingredient } }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ success: false, message: 'Failed to add the ingredient to the shopping list.' });
        }

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred while adding the ingredient to the shopping list.' });
    }
});

// Route to handle saving a recipe
app.post('/save-recipe', async (req, res) => {
    try {
        const { recipeId } = req.body;
        const userId = req.session.userId; // Assuming you have middleware to set req.user
        await User.findByIdAndUpdate(userId, { $addToSet: { savedRecipes: recipeId } });
        res.status(200).json({ message: 'Recipe saved successfully' });
    } catch (error) {
        console.error('Error saving recipe:', error);
        res.status(500).json({ message: 'Error saving recipe' });
    }
});

app.post('/remove-recipe', async (req, res) => {
    try {
        const { recipeId } = req.body;
        const userId = req.session.userId;
        await User.findByIdAndUpdate(userId, { $pull: { savedRecipes: recipeId } });
        res.status(200).json({ message: 'Recipe removed successfully' });
    } catch (error) {
        console.error('Error removing recipe:', error);
        res.status(500).json({ message: 'Error removing recipe' });
    }
});

app.get('/get-saved-recipes', async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        res.status(200).json({ savedRecipes: user.savedRecipes });
    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        res.status(500).json({ message: 'Error fetching saved recipes' });
    }
});

// Route for fridge page
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
            { projection: { _id: 0, username: 0, password: 0 } } // Exclude username and password from projection
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
            const existingItem = await userCollection.findOne({ username: username, 'fridge.id': ingredient.id });
            if (existingItem) {
                // If the item already exists, increase its quantity
                await userCollection.updateOne(
                    { username: username, 'fridge.id': ingredient.id },
                    { $inc: { 'fridge.$.quantity': 1 } }
                );
                return res.json({ exists: ingredient.id });
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
    const newUser = { username: username, password: hashedPassword, email: email, fridge: [], shoppingList: [], savedRecipes: [] };
    await userCollection.insertOne(newUser);    
    // Set session variables
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime; // Set session expiration time
    req.session.userId = newUser._id; 
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
        req.session.userId = result[0]._id;
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
app.get("/Home", async (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/'); // Redirect to index page if not authenticated
        return;
    } else {
        try {
            console.log(req.session.userId);
            const userId = req.session.userId; 
    
            // Fetch the user's savedRecipes array directly
            const user = await userCollection.findOne({ _id: userId });
            const savedRecipeIds = user?.savedRecipes || []; 

            // Fetch detailed information for each saved recipe from Spoonacular API
            const recipeDetailsPromises = savedRecipeIds.map(recipeId => {
                return axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`);
            });
            const recipeDetailsResponses = await Promise.all(recipeDetailsPromises);

            // Extract recipe details
            const recipeDetails = recipeDetailsResponses.map(response => response.data);

            res.render('landingPage', { username: req.session.username, recipes: recipeDetails });
        } catch (error) {
            console.error("Error fetching saved recipes:", error);
            res.status(500).send("Internal Server Error");
        }
    }
});

// Route for handling 404 errors
app.get("*", (req, res) => {
    res.status(404).render('404'); // Render the 404.ejs view
});


