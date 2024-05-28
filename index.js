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
const { getRecipesByIngredients, fetchRecipeDetails, calculateDifficulty,getMissingIngredientsForRecipe} = require('./recipeGen'); // Import functions
const { ingredientSearch } = require('./ingredientApiSearch.js');
const { connectToDatabase, getClient } = require('./databaseConnection');
const User = require('./userModel.js');

const saltRounds = 12; // Number of rounds for bcrypt hashing

const app = express(); // Create an instance of Express
const port = process.env.PORT || 4500; // Set the port to the value in environment variable or default to 4500
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
/* Secret information section - loaded from environment variables */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;//const favicon = require('serve-favicon');//for favicon

const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
/* END secret section */
// Set session expiration time
const expireTime = 60 * 60 * 1000 * 8; // 1 hour in milliseconds

let userCollection;
let mongoStore;

// Connect to database and create MongoStore
async function initializeSessionStore() {
    try {
        const { client, sessionsCollection } = await connectToDatabase();
        userCollection = database.collection('users');
        mongoStore = MongoStore.create({
            client: client,
            dbName: mongodb_database, // Specify database name
            collection: sessionsCollection, // Specify collection
            autoRemove: 'interval',
            autoRemoveInterval: 10,
            touchAfter: 24 * 3600, // Update session in db every 24 hours
        });

        console.log('mongoStore initialized:', mongoStore);
        return mongoStore;
    } catch (error) {
        console.error("Error initializing session store:", error);
        throw error;
    }
}

// Connect to the MongoDB Atlas cluster
connectToDatabase().then(() => {
    const client = getClient();
    const database = client.db(mongodb_database);
    userCollection = database.collection('users');
    mongoStore = MongoStore.create({
        client: client,
        dbName: mongodb_database,
        crypto: {
            secret: mongodb_session_secret
        }
    });

    // Log MongoStore events
    mongoStore.on('create', (session) => {
        console.log('Session created:', session);
    });

    mongoStore.on('update', (session) => {
        console.log('Session updated:', session);
    });

    mongoStore.on('destroy', (session) => {
        console.log('Session destroyed:', session);
    });

    mongoStore.on('error', (error) => {
        console.error('MongoStore error:', error);
    });

    console.log('mongoStore initialized:', mongoStore);

    // Use session middleware
    app.use(session({
        secret: node_session_secret,
        store: mongoStore,
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: expireTime
        }
    }));



    // Set the view engine to EJS
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Route for the home page
    app.get("/", (req, res) => {
        res.render('index'); // Render the index.ejs view
    });

    app.get('/prompt', async (req, res) => {

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

            // Fetch the recipe details from Spoonacular
            const response = await axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`);
            const recipeDetails = response.data;

            // Fetch user data
            let username;
            let fridgeData = [];
            let shoppingListData = [];

            if (req.session && req.session.userId) {
                username = req.session.username;
                const user = await userCollection.findOne(
                    { username: username },
                    { projection: { _id: 0, username: 0, password: 0, email: 0 } }
                );
                if (user) {
                    fridgeData = user.fridge || [];
                    shoppingListData = user.shoppingList || [];
                } else {
                    console.error("User not found.");
                }
            } else {
                console.warn("User not logged in.");
            }

            // Find missing ingredients
            const missingIngredients = await getMissingIngredientsForRecipe(
                recipeId,
                username,
                fridgeData,
                shoppingListData
            );

            // Calculate difficulty rating 
            const steps = recipeDetails.analyzedInstructions.reduce((totalSteps, instruction) => {
                return totalSteps + (instruction.steps ? instruction.steps.length : 0);
              }, 0); 
            console.log("steps:", steps);
            console.log("ingredients:", recipeDetails.extendedIngredients.length);
            console.log("time:", recipeDetails.readyInMinutes);
            const difficulty = calculateDifficulty(
                steps,
                recipeDetails.extendedIngredients.length,
                recipeDetails.readyInMinutes
            );

            // Render the recipe page
            res.render('recipe', {
                recipe: recipeDetails,
                missingIngredients: missingIngredients,
                difficulty: difficulty
            });
        } catch (error) {
            console.error("Error fetching recipe details:", error);
            res.status(500).json({ error: 'Failed to fetch recipe details' }); // Send JSON error response instead of alert
        }
    });
    // Route to handle recipe search by ingredients
    app.post('/recipes', async (req, res) => {
        try {
            const ingredients = req.body.ingredients || ['chicken', 'broccoli', 'rice']; // Default ingredients if none provided
            const cuisine = req.body.cuisine;
            const recipes = await getRecipesByIngredients(ingredients, cuisine); // Pass axios instance
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

    // Route to add items to users' shopping list on ingredientslistpage.
    app.post('/addToShoppingList', async (req, res) => {
        console.log(req.body.ingredientId, req.body.ingredientName, req.body.ingredientUnit);
        const ingredientId = parseInt(req.body.ingredientId, 10);
        const ingredientName = req.body.ingredientName;
        const ingredientAmount = parseFloat(req.body.ingredientAmount);
        const ingredientUnit = req.body.ingredientUnit;

        const ingredientDetails = await axios.get(`https://api.spoonacular.com/food/ingredients/${ingredientId}/information?apiKey=${SPOONACULAR_API_KEY}&amount=${ingredientAmount}&unit=${ingredientUnit}`);
        var ingredientPrice = parseFloat((ingredientDetails.data.estimatedCost.value / 100).toFixed(2)); // prices are stored in cents, divide by 100 for dollars and cents

        // some ingredients can cost less than a cent if the amount is small enough
        // set the minimum price to 1 cent
        if (ingredientPrice < 0.01) {
            ingredientPrice = 0.01;
        }

        const username = req.session.username;

        const user = await userCollection.findOne({ username: username });

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
        }

        const ingredient = {
            id: ingredientId,
            name: ingredientName,
            amount: ingredientAmount,
            price: ingredientPrice,
            unit: ingredientUnit
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
    //Route to get items from shoppinglist array
    app.get('/getShoppingList', async (req, res) => {
        const username = req.session.username;

        try {
            const user = await userCollection.findOne({ username: username });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            res.json({ success: true, shoppingList: user.shoppingList });
        } catch (error) {
            console.error('Error fetching shopping list:', error);
            res.status(500).json({ success: false, message: 'An error occurred while fetching the shopping list.' });
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
            const sorting = req.body.sorting;
            if (!ingredientToSearch) {
                // Return error response if ingredient is not provided
                res.status(400).json({ error: 'Ingredient not provided in the request' });
                return;
            }

            // Search for ingredients using Spoonacular API
            const results = await ingredientSearch(ingredientToSearch, sorting);
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

    // Route for calculating the total cost of a recipe
    app.post('/recipeCost', async (req, res) => {
        try {
            const recipeId = req.body.recipeId;
            const response = await axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`);

            if (!response.data.pricePerServing) {
                throw new Error('Price per serving not available');
            }

            const totalCost = response.data.pricePerServing;

            res.json({ totalCost: totalCost });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ error: 'Could not fetch recipe cost' });
        }
    });


    // Route for the signup page
    app.get("/signup", (req, res) => {
        res.render('signup', { query: req.query });
    });

    // Route to handle user signup form submission
    app.post('/submitUser', async (req, res) => {
        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;

        const schema = Joi.object({
            username: Joi.string().alphanum().max(20).required(),
            password: Joi.string().max(20).required(),
            email: Joi.string().email().required()
        });

        const validationResult = schema.validate({ username, password, email });
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.redirect("/signup");
            return;
        }

        const emailExists = await userCollection.findOne({ email: email });
        if (emailExists) {
            res.redirect("/signup?error=emailExists");
            return;
        }

        var hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = { username: username, password: hashedPassword, email: email, fridge: [], shoppingList: [], savedRecipes: [] };
        const insertResult = await userCollection.insertOne(newUser);
        const userId = insertResult.insertedId; // Get the inserted user's ID

        req.session.authenticated = true;
        req.session.username = username;
        req.session.userId = userId;
        req.session.cookie.maxAge = expireTime;

        console.log("Inserted user with ID:", userId);

        req.session.save(function (err) {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).send('Internal Server Error');
            } else {
                console.log('Session saved successfully after sign-up.');
                res.redirect('/Home');
            }
        });
    });


    // Route for the login page
    app.get('/login', (req, res) => {
        res.render('login'); // Render the login.ejs view
    });

    // Route to handle form submission on user profile page
    app.post('/settings', async (req, res) => {
        try {
            await connectToDatabase();
            const client = getClient();
            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection('settings');

            const userSettings = {
                username: req.body.username,
                name: req.body.name,
                email: req.body.email,
                company: req.body.company,
                password: req.body.newPassword,
                bio: req.body.bio,
                birthday: req.body.birthday,
                country: req.body.country,
                phone: req.body.phone,
                website: req.body.website,
                notifications: {
                    comments: req.body.comments === 'on',
                    forum: req.body.forum === 'on',
                    follows: req.body.follows === 'on',
                    news: req.body.news === 'on',
                    updates: req.body.updates === 'on',
                    blog: req.body.blog === 'on'
                }
            };

            await collection.insertOne(userSettings);
            res.send('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            res.status(500).send('Error saving settings');
        }
    });

    // Route to handle user login form submission
    app.post('/loggingin', async (req, res) => {
        var email = req.body.email;
        var password = req.body.password;

        const schema = Joi.string().email().required();
        const validationResult = schema.validate(email);
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.redirect("/login");
            return;
        }

        const result = await userCollection.find({ email: email }).project({ email: 1, username: 1, password: 1, user_type: 1, _id: 1 }).toArray();

        if (result.length != 1) {
            res.redirect("/invalidPassword");
            return;
        }

        if (await bcrypt.compare(password, result[0].password)) {
            console.log("correct password");

            req.session.authenticated = true;
            req.session.username = result[0].username;
            req.session.user_type = result[0].user_type;
            req.session.userId = result[0]._id;
            req.session.cookie.maxAge = expireTime;

            req.session.save(function (err) {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.status(500).send('Internal Server Error');
                } else {
                    console.log('Session saved successfully after login.');
                    res.redirect('/loggedIn');
                }
            });
        } else {
            res.redirect("/invalidPassword");
        }
    });

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
            return res.status(400).render('reset-password-fail');
        }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await userCollection.updateOne({ _id: user._id }, { $set: { password: hashedPassword, resetToken: null, resetTokenExpires: null } });
        res.render('reset-password-success');
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

    app.get('/location', (req, res) => {
        res.render('location');
    });
    // Route to render the ingredients list page at /shoppingList
    app.get('/shoppingList', (req, res) => {
        res.render('ingredientsList');
    });

    // Route to render the settings page at /profile
    app.get('/profile', (req, res) => {
        res.render('profile');
    });

    // Route for handling 404 errors
    app.get("*", (req, res) => {
        res.status(404).render('404'); // Render the 404.ejs view
    });


    // Start the server and listen on the specified port
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(error => {
    console.error("Failed to connect to MongoDB Atlas:", error);
    process.exit(1);
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



