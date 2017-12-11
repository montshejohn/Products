const express = require("express");
const app = express();
const qs = require("qs");
const request = require("request");
const bodyParser = require("body-parser");
var getRequestToken = require("./src/twitter/get-request-token.js");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

var users = [];

function signup(name, email, password) {
  // console.log(email);
  users.push({ name, email, password });
  // LocalStorage["name"] = users;
}

function getUser(email, password) {
  return users.find(u => u.email == email && u.password == password);
}

app.post("/signup", function(request, response) {
  var signupDetails = request.body;
  var userId = signupDetails.email;
  //1. we need to save this somewhere
  //console.log(signupDetails);
  //2. we need to check if the user already exists
  var LocalStorage = require("node-localstorage").LocalStorage;
  var localStorage = new LocalStorage("./scratch");
  //localStorage.setItem("name", signupDetails.name);
  localStorage.setItem(userId, JSON.stringify(signupDetails));
  // console.log(localStorage.getItem("name"));
  //3. we cannot save the password, we need to save a one way hash of the password

  var res = [];
  for (var i = 0; i < localStorage.length; i++) {
    res.push(localStorage.key(i));
  }
  console.log(userId);
  if (res.indexOf(userId) > 0) {
    console.log(Error("user already exists"));
  }
  //using bcrypt

  signup(signupDetails.name, signupDetails.email, signupDetails.password);

  response.status(201).end();

  users.push(signupDetails);
});

app.get("/login", function(request, response) {
  const email = request.query.email;
  const password = request.query.password;

  const user = getUser(email, password);

  if (user) {
    response.status(200).end();
  } else {
    response.status(401).end();
  }
});

const config = {
  consumerKey: "Rz63spEaepbrHThkMtr5TJgFj",
  consumerSecret: "1hir1CnQKcH5Ma27EvorqqvRI8vi5F1lgO3jbsTVgM70qB5YII"
};

app.get("/authorize/twitter", (req, res) => {
  console.log("Requesting a refresh token from twitter");
  const callback = (err, data) => {
    if (err) {
      res.statusCode(500);
    }
    console.log("Received refresh token from twitter", data);

    //TODO: Do not return html here, rather return just the request token
    // and it's the client's responsibility to do the redirect
    res.send(
      "<a href='https://api.twitter.com/oauth/authorize?oauth_token=" +
        data.oauth_token +
        "'>Authorize Twitter</a>"
    );
  };

  getRequestToken(callback);
});

app.get("/twitter/callback", (req, res) => {
  var tokenDetails = qs.parse(req.query);

  getAccessToken(
    tokenDetails.oauth_verifier,
    tokenDetails.oauth_token,
    (err, data) => {
      if (err) {
        console.log("error when getting access token", err);
        res.send(
          "<h1>Something went wrong while giving access, please try again.</h1>"
        );
      } else {
        console.log("the access token is: ", data);

        //tweet("Theo Just authorized the StatusWave app",data.oauth_token, data.oauth_token_secret);

        res.json({ success: true });

        res.send("<h1>congrats, you have authorized us</h1>");
      }
    }
  );
});

function getAccessToken(oauthVerifier, oauthToken, cb) {
  var oauth = {
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret,
    token: oauthToken // in the documentation this says that it should be oauth_token but that does not work, it should just be token like the other requests and then it works.
  };
  request.post(
    {
      url: "https://api.twitter.com/oauth/access_token",
      oauth: oauth,
      qs: { oauth_verifier: oauthVerifier }
    },
    function(error, response, body) {
      if (error) {
        console.log(error);
        cb(error);
        return;
      }

      var data = qs.parse(body);
      cb(null, data);
    }
  );
}

app.listen(3000, () =>
  console.log("The server started correctly and is listening on port 3000!")
);

function tweet(message, token, tokenSecret) {
  const url = "https://api.twitter.com/1.1/statuses/update.json";

  var oauth = {
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret,
    token: token,
    token_secret: tokenSecret
  };

  console.log("tweeting with ouath deatils", oauth);

  var options = {
    url: url,
    oauth: oauth,
    qs: { status: message }
  };

  request.post(options, function(err, httpResponse, body) {
    console.log("http response code", httpResponse.statusCode);
    console.log("http response body", httpResponse.body);

    if (err) {
      console.log(err);
    }
  });
}
