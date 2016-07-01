var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var Sequelize = require('sequelize');
var pg = require('pg');
const bcrypt = require('bcrypt');

// connect to the database
var sequelize = new Sequelize('fbadmin', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});

// create table called admins
var Admin = sequelize.define('admin', {
	fbid: Sequelize.BIGINT,
	name: Sequelize.STRING,
	email: Sequelize.STRING,
	picture: Sequelize.STRING
})

// create table called groups
var Group = sequelize.define('group', {
	fbgroupid: Sequelize.BIGINT,
	name: Sequelize.STRING
})

// create table called members
var Member = sequelize.define('member', {
	fbmemberid: Sequelize.BIGINT,
	name: Sequelize.STRING,
	location: Sequelize.STRING,
	picture: Sequelize.STRING
})

// declaring relationships
Admin.hasMany(Group);
Group.belongsTo(Admin);

Group.hasMany(Member);
Member.belongsTo(Group);

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

app.use(session({ // middleware is stuff that happens when someone does a request
	secret: 'oh wow very secret much security',
	resave: true,
	saveUninitialized: false
}));

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

// initial log in
app.get('/', function (req,res) {
		res.render('index')
})

app.post('/admin', function (req, res) {
	fbinfo = req.body.fbinfo

	Admin.findOrCreate( {
		where: {
			fbid: fbinfo.id,
			name: fbinfo.name,
			email: fbinfo.email,
			picture: fbinfo.picture.data.url
		}
	}).then(function(theadmin) {
		for (var i = 0; i < fbinfo.admined_groups.data.length; i++) {
			makeMeGroup(theadmin, fbinfo, i, makeMeMembers)
		}
	})
})
function makeMeGroup(theadmin, fbinfo, i, callback) {
	Group.findOrCreate({ where: {
		fbgroupid: fbinfo.admined_groups.data[i].id,
		name: fbinfo.admined_groups.data[i].name,
		adminId: theadmin[0].id
	}}).then(function(thegroup){
		callback(thegroup, fbinfo, i)
	})
}
function makeMeMembers(thegroup, fbinfo, i) {
	console.log('members data')
	for (var j = 0; j < fbinfo.admined_groups.data[i].members.data.length; j++) {
		console.log('create a member')
		doMember(i,j, thegroup, fbinfo)
	}
}

function doMember(i,j, thegroup, fbinfo) {
	console.log('Data j ' + j)
	console.log(fbinfo.admined_groups.data[i].members.data[j])
	if (fbinfo.admined_groups.data[i].members.data[j].location != undefined) {
		Member.findOrCreate({ where: {
			fbmemberid: fbinfo.admined_groups.data[i].members.data[j].id,
			name: fbinfo.admined_groups.data[i].members.data[j].name,
			location: fbinfo.admined_groups.data[i].members.data[j].location.name,
			picture: fbinfo.admined_groups.data[i].members.data[j].picture.data.url,
			groupId: thegroup[0].id
		}})
	} else {
		Member.findOrCreate({ where: {
			fbmemberid: fbinfo.admined_groups.data[i].members.data[j].id,
			name: fbinfo.admined_groups.data[i].members.data[j].name,
			picture: fbinfo.admined_groups.data[i].members.data[j].picture.data.url,
			groupId: thegroup[0].id
		}})
	}
	
}

app.get('/profile', function (req, res) {
	Admin.findOne( {
		where: {id: 1},
		include: [Group]
	}).then(function(admininfo) {
		console.log("bloop")
		console.log(req.session.admin)
		var data = admininfo;
		console.log(data);
		res.render('profile', {
			data: data
		})
	})
})
// app.get('/indexjson',
// 	function(req, res) {
// 		res.send(admininfo)
// });

// // displays group members of a group
// app.get('/groups/:id', function (req, res) {
// 	console.log(req.params.id);
// 	Group.findAll({
// 		where: {id: req.params.id},
// 		include: [ Member ]
// 	}).then(function (group) {
// 		console.log(group);
// 		res.render('group')
// 	});
// });


// creates all the tables to the table



			// for (var j; j < fbinfo.admined_groups.data[i].members.data.length; j++) {
			// 	Member.create({
			// 		fbmemberid: fbinfo.admined_groups.data[i].members.data[j].id,
			// 		name: fbinfo.admined_groups.data[i].members.data[j].name,
			// 		location: fbinfo.admined_groups.data[i].members.data[j].location.name,
			// 		picture: fbinfo.admined_groups.data[i].members.data[j].picture.data.url
			// 	})
			// }

// // adds groups to the table
// app.post('/group', function (req,res) {
// 	fbinfo = req.body.fbinfo
// 	Admin.findOne({
// 		where: {

// 		}
// 	}).then(function(admin){
// 		admin.createGroup({
// 			fbgroupid: fbinfo.
// 		})
// 	})
// })


// // create new group

// // create new members

// // update member locations

// // shows profile and groups
// app.get('/profile', function (req, res) {
// 	var admin = req.session.admin;
// 	if (admin === undefined) {
// 		res.redirect('/?message=' + encodeURIComponent("Please log in to access the blog."));
// 	} else {
// 		Group.findAll({
// 			where: {
// 				adminId: admin.id
// 			}
// 		}).then(function(groups) {
// 			var groups = groups;
// 			console.log(data)
// 		})
// 		res.render('profile', {
// 			admin: admin,
// 			groups: groups
// 		})
// 	}
// })

// app.post('/login', function (req, res) {
// 	if(req.body.username.length === 0) {
// 		res.redirect('/?message=' + encodeURIComponent("Please fill out your username."));
// 		return;
// 	}

// 	if(req.body.password.length === 0) {
// 		res.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
// 		return;
// 	}

// 	Admin.findOne({
// 		where: {
// 			username: req.body.username
// 		}
// 	}).then(function (admin) {
// 		if (admin !== null) {
// 			var hash = admin.password;
// 			bcrypt.compare (req.body.password, hash, function (err, result) {
// 				req.session.admin = admin;
// 				res.redirect('/profile')
// 			})
// 		} else {
// 			res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
// 		}
// 	}, function (err) {
// 			res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
// 	})
// })

// app.get('/logout', function (req, res) {
// 	req.session.destroy(function(err) {
// 		if(err) {
// 			throw err;
// 		}
// 		res.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
// 	})
// });


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

sequelize.sync( {force: true} ).then(function () {
	var server = app.listen(3000, function () {
		console.log('Diversability app listening on port: ' + server.address().port);
	});
});