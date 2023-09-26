const express = require('express')
const cookieParser = require('cookie-parser');
const app = express();
const port = 3000
const ejs = require("ejs");
app.set('view engine', 'ejs');
const bcrypt = require('bcrypt');//for pass hashing
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Filter } = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

app.use(cookieParser());


app.get('/home', (req, res) => {
  res.render(__dirname + '/views/index.ejs');
});
app.get('/menu', (req, res) => {
  res.render(__dirname + '/views/menu.ejs');
});

app.get('/orders', (req, res) => {
  res.render(__dirname + '/views/orders.ejs');
});
app.get('/payment', (req, res) => {
  res.render(__dirname + '/views/payment.ejs');
});

app.post('/paymentverify', (req, res) => {
  const email1 = req.body.email1;
  const cardno = req.body.cardnumber;
  const expiry = req.body.expiry;
  const cvv = req.body.cvv;
  if (email1 && cardno && expiry && cvv) {
    res.render(__dirname + '/views/confirm.ejs');
  }
  else {
    const details = "please fill ur card details";
    res.send("<script>alert('" + details + "')</script>");
  }
});

app.get('/orderconfirm', (req, res) => {
  res.render(__dirname + '/views/confirm.ejs');
});

app.get("/signup", function (req, res) {
  res.render(__dirname + '/views/signup.ejs', { mess: " ", pass: " ", loginerror: " ", mess1: " " });
});

app.post("/signupSubmit", async (req, res) => {
  const Fname = req.body.name;
  const em = req.body.email;
  const ps = req.body.password;
  const rps = req.body.repass;

  // Hash the user's password
  const hashedPassword = await bcrypt.hash(ps, 10);

  db.collection("userdemo")
    .where(
      Filter.or(
        Filter.where('Firstname', '==', Fname),
        Filter.where('Email', '==', em)
      )
    )
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        const messe = "hey this username or email is already exist try other one";
        res.render(__dirname + '/views/signup.ejs', { mess: " ", pass: " ", loginerror: " ", mess1: messe });
      }
      else {
        //checking if user entered all forms without leaving .

        if (Fname && em && ps && rps) {
          db.collection("userdemo").add({
            Firstname: req.body.name,
            Email: req.body.email,
            Password: hashedPassword,
          }).then(() => {
            res.render(__dirname + '/views/login.ejs', { mess: " ", pass: " ", loginerror: " ", mess1: " " });
          })
        }

        //if user forget to enter any details sending them an error message

        else {
          const messe = "please fill all the forms";
          res.render(__dirname + '/views/signup.ejs', { mess: " ", pass: " ", loginerror: " ", mess1: messe });
        }
      }
    });
})

app.get('/', (req, res) => {
  res.render(__dirname + '/views/login.ejs', { mess: " ", pass: " ", loginerror: " ", mess1: " " });
});

app.post("/loginSubmit", function (req, res) {
  const email = req.body.email;
  const password = req.body.password;
  // Check if email and password are defined and not empty
  if (!email && !password) {
    const errormess = "Please enter your email or number";
    const errorpass = "please enter your password";
    res.render(__dirname + '/views/login.ejs', { mess: errormess, pass: errorpass, loginerror: "", mess1: " " });
    return;
  }

  //check if only email is entered and password is not entered
  else if (email && !password) {
    const errorpass = "please enter your password";
    res.render(__dirname + '/views/login.ejs', { mess: "", pass: errorpass, loginerror: "" });
    return;
  }

  //check if only  password is entered and email is not entered 
  else if (!email && password) {
    const errormess = "please enter your email";
    res.render(__dirname + '/views/login.ejs', { mess: errormess, pass: "", loginerror: "" });
    return;
  }
  // check if both email and password are entered correctly .

  console.log("Attempting to login with Email:", email, "Password:", password);

  db.collection("userdemo")
    .where("Email", "==", email)
    .get()
    .then(async (docs) => {
      if (docs.size > 0) {
        const userDoc = docs.docs[0]; // Get the first matching document
        const userData = userDoc.data(); // Get the data of the matching document
        const hashedPassword = userData.Password;

        // Comparing the input password with the hashed password
        const passwordMatch = await bcrypt.compare(password, hashedPassword);
        if (passwordMatch) {
          const firstName = userData.Firstname;
          res.cookie('username', firstName);
          return res.render(__dirname + '/views/index.ejs');
        } else {
          const login = "Login failure, please enter details correctly";
          return res.render(__dirname + '/views/login.ejs', { loginerror: login, mess: "", pass: "" });
        }
      } else {
        const login = "Login failure, please enter details correctly";
        res.render(__dirname + '/views/login.ejs', { loginerror: login, mess: "", pass: "" });
      }
    })
    .catch((error) => {
      console.error("Error querying Firestore:", error);
      res.status(500).send("Internal Server Error");
    });
});
app.get("/storeDetails", function (req, res) {
  db.collection("contactDetails").add({
    Firstname: req.query.firstname,
    Lastname: req.query.lastname,
    Email: req.query.email,
    Subject: req.query.subject,
    Message: req.query.message,
  }).then(() => {
    const successMessage = "Data stored successfully!";
    const redirectToIndex = "window.location.href='/home'";
    res.send(`<script>alert('${successMessage}'); ${redirectToIndex};</script>`);
  })
});

app.listen(port, () => {
  console.log(` listening on port ${port}`)
})