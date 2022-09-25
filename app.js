const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Registering a new user

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  //console.log(hashedPassword);
  const selectUserQuery = `
        SELECT * FROM
            user
        WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  //console.log(dbUser);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
                INSERT INTO user 
                    (username, name, password, gender, location)
                VALUES (
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                )`;
      //console.log(createUserQuery);
      const dbResponse = await db.run(createUserQuery);
      //console.log(dbResponse);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// User Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  //console.log(password);
  const selectUserQuery = `
            SELECT * FROM user
            WHERE username = '${username}';`;
  //console.log(selectUserQuery);
  const dbUser = await db.get(selectUserQuery);
  //console.log(dbUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// changing passwords
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
            SELECT * FROM user
            WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  const isOldPasswordMatched = await bcrypt.compare(
    oldPassword,
    dbUser.password
  );
  if (isOldPasswordMatched) {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
            UPDATE user
            SET password = '${newHashedPassword}'
            WHERE username = '${username}';`;
      await db.run(updatePasswordQuery);
      response.status(200);
      response.send("Password updated");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});
module.exports = app;
