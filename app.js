'use strict';
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
var session = require('express-session');

var app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nepalfishkeepers-c5925.firebaseio.com"
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'nfk',
  resave: true,
  saveUninitialized: false,
  cookie: { }
}));

// middleware for session
app.use(function (req, res, next) {
  res.locals.session = req.session && req.session.email;
  next();
});

var db = admin.database();

// All routes
function requiresLogin(req, res, next) {
  if (req.session && req.session.email) {
    return next();
  } else {
    var err = new Error('You must be logged in to view this page.');
    err.status = 401;
    return next(err);
  }
}

app.get('/', requiresLogin, function (req, res) {
    // var ref = db.ref("NFK");
    // ref.once("value", function(snapshot) {
    //   console.log(snapshot.val());
    // });
  res.render('index', { title: "Welcome" });
});

app.get('/posts', function(req, res) {
  var ref = db.ref('NFK');
  ref.once('value', function(snapshot) {
    let posts = [];
    snapshot.forEach((childSnapshot) => {
      posts.push({key: childSnapshot.key, post: childSnapshot.val()});
    });
    return res.render('posts', {title: 'Posts', posts : posts});
  });
  return res.render('posts', {title: 'Posts', posts : null });
});

app.post('/posts/:id', function(req, res) {
  const key = req.params.id;
  var ref = db.ref('NFK/' + key);
  if(req.body.submit == 'Delete') {
    ref.remove().then(function() {
      // Delete trades
      var tradeRef = db.ref('Trades/' + key);
      tradeRef.remove().then(function() {
        return res.redirect(200, '/posts');
      })
      .catch(function(error) {
        next(error);
      });
    })
    .catch(function(error) {
      next(error);
    });
  }

});

app.get('/login', function(req, res) {
  res.render('login', { title: "Login"});
});

app.post('/login', function(req, res) {
  const email = req.body.email,
    password = req.body.password;

  if(email === "admin" && password === "admin") {
    req.session.email = email;
    return res.redirect('/');
  }
  return res.render('login', {error: true})
});

app.post('/logout', requiresLogin, function(req, res, next) {
  req.session.destroy(function(err) {
    if(err) {
      return next(err);
    } else {
      return res.redirect('/login');
    }
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
  if(err.status == 401) {
    return res.redirect('/login');
  }
})

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'));
