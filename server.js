var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var request = require('request');
var path = require('path');
var mime = require('mime');
var google = require('google-images');

// upload attachment to trello
var addAttachment = function(cardId, url, callback) {
	// get base name of the url
	var fileName = path.basename(url);
	// get content type of the url
	var contentType = mime.lookup(url, 'application/octet-stream');

	request.post({
		url: 'https://api.trello.com/1/cards/' + cardId + '/attachments',
		qs: {
			key: process.env.TRELLO_KEY,
			token: process.env.TRELLO_SECRET
		},
		formData: {
			url: url,
			name: fileName,
			mimeType: contentType
		}
	}, callback);
};

// use bodyParser to parse POST body
app.use(bodyParser.json());

// trello calls this in initialization
app.head('/', function(req, res) {
	res.end('hi webhook');
});

// trello calls this when things happened
app.post('/', function(req, res) {
	res.end('hi trello');

	// the datas we want are all in action	
	var action = req.body.action;
	var type = action.type;
	var card = action.data.card;

	console.log(action);

	// only deals with these types
	var supportType = ['createCard', 'updateCard', 'createCheckItem'];
	// don't to anything if type is not in this array
	if (supportType.indexOf(type) < 0) {
		return;
	}

	// use card name or check list item for keyword
	var text;
	if (type === 'createCard' || type === 'updateCard') {
		text = card.name;
	} else if (type === 'createCheckItem') {
		text = action.data.checkItem.name;
	}

	// tokenize the words
	var tokens = text.split(' ');
	if (!tokens || !tokens.length) {
		return;
	}

	// get one random word from tokens and append meme as query for google image
	var keyword = tokens[Math.floor(Math.random() * (tokens.length - 1))] + ' meme';
	google.search(keyword, function(err, images) {
		if (!images || images.length <= 0) {
			return;
		}

		// filter out urls without image extensino
		images.filter(function(item) {
			return item.url.indexOf('.png') > -1 || item.url.indexOf('.jpg') > -1 || item.url.indexOf('.jpeg') > -1 || item.url.indexOf('.gif') > -1;
		});

		// check length again after filter
		if (images.length <= 0) {
			return;
		}

		console.log('[%s] %s %s', keyword, text, images[0].url);

		// add attachment in this card
		addAttachment(card.id, images[0].url, function(err, res, body) {});
	});
});
app.listen(process.env.PORT || 5000);