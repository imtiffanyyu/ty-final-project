var express = require('express');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;

// Create a new Express application.
var app = express();

// Configure view engine to render pug templates.
app.set('views', './src/views');
app.set('view engine', 'pug');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

app.use(express.static('public'));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
// passport.use(new Strategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: 'http://localhost:3000/login/facebook/return'
//   },
//   function(accessToken, refreshToken, profile, cb) {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
  //   return cb(null, profile);
  // }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
// passport.serializeUser(function(user, cb) {
//   cb(null, user);
// });

// passport.deserializeUser(function(obj, cb) {
//   cb(null, obj);
// });

// Define routes.
app.get('/',
  function(req, res) {
    res.render('index');
  });

// app.get('/login',
//   function(req, res){
//   	console.log(req.user);
//     res.render('login');
//   });

// app.get('/login/facebook',
//   passport.authenticate('facebook', {
// 			scope : ['public_profile', 'user_location', 'user_managed_groups', 'email']
// 		}));

// app.get('/login/facebook/return', 
//   passport.authenticate('facebook', { failureRedirect: '/login' }),
//   function(req, res) {
//   	console.log(req.user);
//     res.redirect('/');
//   });

// app.get('/profile',
//   require('connect-ensure-login').ensureLoggedIn(),
//   function(req, res){
//   	console.log(req.user);
//     res.render('profile', { user: req.user });
//   });

var server = app.listen(3000, function () {
	console.log('Diversability app listening on port: ' + server.address().port);
});