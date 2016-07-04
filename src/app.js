var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var Sequelize = require('sequelize');
var pg = require('pg');
const bcrypt = require('bcrypt');
var GoogleMapsAPI = require('googlemaps');

// Google Maps API
var config = {
	key: 'AIzaSyDpqwFm2cq9TtB4pijrvuun0dYq6NlUQZg',
  stagger_time:       1000, // for elevationPath
  encode_polylines:   false,
  secure:             true, // use https
  proxy:              'http://localhost:3000/' // optional, set a proxy for HTTP requests
};


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

app.get('/group/:id', function (req, res) {
	console.log(req.params.id);
	Group.findOne({
		where: {id: req.params.id},
		include: [ Member ]
	}).then(function (groupinfo) {
			var points = groupinfo.members.map(function(member){
				return member.location;
			})
			console.log('points stuff')
			console.log(points)
			console.log("bleep");
			var groupdata = groupinfo;
			console.log(groupdata);

			var pointsObject = [];
			for (var i = 0; i < points.length; i++) {
				if (points[i] !== null) {
					pointsObject.push ({location: points[i]})
				}
			}

			var gmAPI = new GoogleMapsAPI(config);
			var params = {
				size: '500x400',
				maptype: 'roadmap',
				markers: pointsObject	
		
			};
		var mapURL = gmAPI.staticMap(params); // return static map URL
		console.log(mapURL)
		res.render('group', {
			groupdata: groupdata,
			mapURL: mapURL
		})
		
	})
})

// update member locations


sequelize.sync( {force: true} ).then(function () {
	var server = app.listen(3000, function () {
		console.log('Map My Members app listening on port: ' + server.address().port);
	});
});