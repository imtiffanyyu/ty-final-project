var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var Sequelize = require('sequelize');
var pg = require('pg');
var GoogleMapsAPI = require('googlemaps');

// Google Maps API
var config = {
	key: process.env.GOOGLE_KEY,
  stagger_time:       1000, // for elevationPath
  encode_polylines:   false,
  secure:             true, // use https
  proxy:              'http://localhost:3000/' // optional, set a proxy for HTTP requests
};

var fbkey = process.env.FB_KEY;

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
	name: Sequelize.STRING,
	description: Sequelize.TEXT
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


// Define routes.

// initial log in
app.get('/', (req,res) => {
	console.log(fbkey)
	res.render('index', {
		fbkey: fbkey
	})
})

// creates tables based off of FB login
app.post('/admin', (req, res) => {
	fbinfo = req.body.fbinfo

	Admin.findOrCreate( {
		where: {
			fbid: fbinfo.id,
			name: fbinfo.name,
			email: fbinfo.email,
			picture: fbinfo.picture.data.url
		}
	}).then( (theadmin) => {
		for (var i = 0; i < fbinfo.admined_groups.data.length; i++) {
			makeMeGroup(theadmin, fbinfo, i, makeMeMembers)
		}
		res.send('success')
	})
})

function makeMeGroup(theadmin, fbinfo, i, callback) {
	Group.findOrCreate({ 
		where: {
			fbgroupid: fbinfo.admined_groups.data[i].id,
			name: fbinfo.admined_groups.data[i].name,
			description: fbinfo.admined_groups.data[i].description,
			adminId: theadmin[0].id
		}
	}).then( (thegroup) => {
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

// creates profile page for FB user
app.get('/profile', (req, res) => {
	Admin.findOne( {
		where: {id: 1},
		include: [Group]
	}).then( (admininfo) => {
		console.log(req.session.admin)
		var data = admininfo;
		console.log(data);
		res.render('profile', {
			data: data
		})
	})
})

// creates pages for each group
app.get('/group/:id', (req, res) => {
	console.log(req.params.id);
	Group.findOne({
		where: {id: req.params.id},
		include: [ Member ]
	}).then( (groupinfo) => {
		var points = groupinfo.members.map( (member) => {
			return member.location;
		})

		var icons = groupinfo.members.map( (member) => {
			return member.name.charAt(0);
		})
		
		var groupdata = groupinfo;
		console.log(groupdata);

		var pointsObject = [];
		for (var i = 0; i < points.length; i++) {
			if (points[i] !== null) {
				pointsObject.push ({
					location: points[i], 
					label: icons[i],
					color: 'purple'
				})
			}
		}

		console.log('points stuff')
		console.log(pointsObject);

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

// updates member locations
app.put('/group/:id', (req, res) => {
	Member.findOne({
		where: {
			id: req.body.memberid
		},
		include: [Group]
	}).then( (member) => {
		var object = {};
		var membergroup = member.group.id
		console.log('Member group is ' + membergroup)
		object[req.body.newid] = req.body.newValue;
		console.log(object);
		member.updateAttributes(object).then( ( ) => {
			Group.findOne({
				where: {id: membergroup},
				include: [ Member ]
			}).then( (groupinfo) => {
				var points = groupinfo.members.map( (member) => {
					return member.location;
				})
				var icons = groupinfo.members.map( (member) => {
					return member.name.charAt(0);
				})
				
				var groupdata = groupinfo;

				var pointsObject = [];
				for (var i = 0; i < points.length; i++) {
					if (points[i] !== null) {
						pointsObject.push ({
							location: points[i], 
							label: icons[i],
							color: 'purple'
						})
					}
				}
				console.log('points stuff')
				console.log(pointsObject);
				
				

				var gmAPI = new GoogleMapsAPI(config);
				var params = {
					size: '500x400',
					maptype: 'roadmap',
					markers: pointsObject

				};
		var mapURL = gmAPI.staticMap(params); // return static map URL
		res.send(mapURL)
		
	})
		})
	})
})

sequelize.sync( {force: true} ).then( ( ) => {
	var server = app.listen(3000, ( ) => {
		console.log('Map My Members app listening on port: ' + server.address().port);
	});
});