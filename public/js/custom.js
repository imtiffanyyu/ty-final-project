function sendtobackend (response, redirect) {
  console.log('STB triggered')
  $.ajax({
    method: 'POST',
    url: '/admin',
    data: {
      fbinfo: response
    },
    success: function(data, status){
      console.log('POST Done')
      if (redirect) {
        setTimeout(function (){
          window.location.replace("http://localhost:3000/profile");
        } , 1000 ); 
      }
    },
    error: function(stat, error) {
      console.log('POST Fail with ' + stat)
      console.log(error)
    }
  })
}

// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
  console.log('statusChangeCallback');
  console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      testAPI();
      $('#viewprofile').show();
    } else if (response.status === 'not_authorized') {
      // The person is logged into Facebook, but not your app.
      document.getElementById('status').innerHTML = 'Please log ' +
      'into this app.';
      $('#viewprofile').hide();      
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      document.getElementById('status').innerHTML = 'Please log ' +
      'into Facebook.';
      $('#viewprofile').hide();
      
    }
}

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
  FB.getLoginStatus(function(response) {
    statusChangeCallback(response);
  });
}


// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function testAPI() {
  console.log('Welcome!  Fetching your information.... ');
  FB.api('/me', 'GET',
    {"fields":"id,name,email,picture.type(large),admined_groups{name,id,description,cover,members{name,location,picture}}"}, function(response) {
      console.log(response);
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =  'Thanks for logging in, ' + response.name + '!';
      sendtobackend(response, true);
  });
}

$(document).ready(function(){
  $(".button-collapse").sideNav();

  window.fbAsyncInit = function() {
    FB.init({
      appId      : $('#fbkey').text(),
      cookie     : true,  // enable cookies to allow the server to access 
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v2.5' // use graph api version 2.5
    });

    // Now that we've initialized the JavaScript SDK, we call 
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });

    // Logout of FB and redirect to login page
    FB.Event.subscribe("auth.logout", function() {window.location = '/'});

  };

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));


  $(".editlink").on("click", function(e){
    e.preventDefault();
    var dataset = $(this).prev(".datainfo");
    var savebtn = $(this).next(".savebtn");
    var theid   = dataset.attr("id");
    var newid   = theid+"-form";
    var currval = dataset.text();

    dataset.empty();


    $('<input type="text" name="'+newid+'" id="'+newid+'" value="'+currval+'" class="hlite">').appendTo(dataset);

    $(this).css("display", "none");
    savebtn.css("display", "block");


    $('#location-form').autocomplete({
      source: function( request, response ) {
        $.ajax({
          url: "http://gd.geobytes.com/AutoCompleteCity",
          dataType: "jsonp",
          data: {
            q: request.term
          },
          success: function( data ) {
            response( data );
          }
        });
      },
      minLength: 3,
    });
  });

  $(".savebtn").on("click", function(e){
    e.preventDefault();
    var memberid = $(this).prevAll('.memberid').text();
    console.log(memberid);

      var elink   = $(this).prev(".editlink"); // looks for "editlink" before savebtn
      var dataset = elink.prev(".datainfo"); // looks for "datainfo" before editlink
      var newid   = dataset.attr("id"); // grabs id for form creaton
      var cinput  = "#"+newid+"-form"; // creates form for the id
      var einput  = $(cinput);
      var newval  = einput.val();

      console.log('form value is: ' + newval)
      $(this).css("display", "none");
      einput.remove();
      dataset.html(newval); // Supposed to update the values
      elink.css("display", "block");

      $.ajax({
        method: "PUT",
        url: "/group/:id",
        data: {
          newid: newid,
          newValue: newval,
          memberid: memberid
        },
        success: function(data) {
          console.log(data)
          $ ('#newMap').attr({'src': data})
        }
      })
  });
});