## Pantry Pals
Our project, Pantry Pals, is developing a web app to help home cooks reduce food waste and save money by offering AI powered recipe suggestions based on what’s already in your fridge.

## Technologies Used
### MongoDB
For our project, we decided to utilize `MongoDB` as our backend server due to its simplicity and easy integreation. The reason we needed a server in the first place is to store and call data into our application, creating a seamless interaction. 
### Spoonacular API
`Spoonacular` is a crucial API that was adopted into our project due to how vital is was in calling and displaying recipes. Furthermore, Spoonacular also has the ability to let users filter dishes by ingredients, diets, difficulty, and even nationally. The Spoonacular
API was implemented onto our backend.
### Walmart API
We leveraged the `Walmart API` to collect infomration about how much ingredients cost. This helps users better visualize how much their meal will cost. This API was integrated in our backend system


## Usage
### Node.js
Our program uses `Node.js` to transfer users between pages while also injecting ejs format files on the page. To properly run
the program, you must first enter "npm i" to install all requires. Then finally enter "node index.js" into the console
to finish setting up the project. 

## Features
### Login & Sign-Up
When first directed to the application, users will be able to create an account that can be used to store data next them they sign in. Furthermore, users are also able to
click "Forgot Password" if they cannot recall their password. A link will be sent to their email with a new suggested password. 

### Recipe Generation
Users will be able to input the ingredients they have in their fridge to create a list of dishes they are able to create. From there, users can filter the dishes by difficulty 
and dish nationality (asian, middle easter, nordic, etc...)

### Price Check 
Another intuitive feature that we have implmeented is the ability to check how much each missing ingredient costs to buy from Walmart using the Walmart API.

### Shopping List
When users are mssing ingredients for their dish, they have the ability to add those missing items into a shopping list with the click of a button. From there, the user can quickly navigate to the "Shopping List" page to quickly view items they need to purchase. Users can also cross out items in the list once they have been purchased. 

## References & Credits
### MondoDB Database
MongoDB Database Link: https://www.mongodb.com

### Spoonacular API 
Spoonacular API Link: https://spoonacular.com/food-api

### Walmart API
Walmart API Link: https://developer.walmart.com

## File Listing
### Public Folder
Our public folder is used to store images, css styles, and javascript files

### Views Folder
The views folder is used to hold all ejs files that are used to be injected into the website. 

### Other
All other files are mainly JS files that act as a connector with the front end logic and the backend logic

## AI Utilization
No AI tools such as ChatGPT or Copilot was used in our application.

## Team Info
Team Name: BBY-30
Team Members: 
- Robin 
- Farzad
- Raziel
- Joey
- Sohail
## Contact Information
Email: bby30pantrypal@gmail.com
