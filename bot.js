var Slack = require('slack-client');
var redis = require('redis');
var moment = require('moment');
var Promise = require('bluebird');
var config = require('./config.json');
var API_TOKEN = config.SLACK_TOKEN;

var slack = new Slack(API_TOKEN, /*autoReconnect: */ true, /*autoMark: */ true);
var redisClient = redis.createClient();
var redisToSlack = redis.createClient();
slack.on('open', function () {
    console.log('connected');
});
slack.on('message', function (data) {
    var user = slack.getUserByID(data.user);
    var message = data.text;
    var channel = slack.getChannelGroupOrDMByID(data.channel);
    var type = data.type;
    var timestamp = moment().valueOf();
    
    if (!user) {
        console.log('unable to query user', user, 'message', message);
        return;
    }
    if (!channel) {
        console.log('unable to query channel', channel);
        return;
    }
    
    var messageKey = '' + channel.name + '_' + user.name + '_' + type;
    redisClient.incr('messageid', function (err, messageId) {
        if (err) {
            console.log(err);
            return;
        }
        var messageKey = 'message:' + messageId;
        redisClient.set(messageKey, JSON.stringify({
            channel: {
                name: channel.name,
                id: channel.id
            },
            user: {
                name: user.name,
                id: user.id
            },
            type: type,
            timestamp: timestamp,
            message: message
        }), function (err, reply) {
            if (err) {
                console.log(err);
                return;
            }
            console.log('set', messageKey, message);
            redisClient.publish('from-slack', messageKey);
        });
    })
});

slack.login();

redisToSlack.subscribe('to-slack');
redisToSlack.on('message', function(redischannel, key) {
    var msgFrom = 'unknown';
    if (key) {
        var parts = key.split(':');
        if (parts.length >= 2 && parts[1]) {
            msgFrom = parts[1];
        }
    }
    redisClient.get(key, function (err, message) {
        if (err) {
            console.log(err);
            return;
        }
        var messageObject = JSON.parse(message);
        if (messageObject && messageObject.channel && messageObject.channel.id && messageObject.message) {
            var channel = slack.getChannelGroupOrDMByID(messageObject.channel.id);
            if (channel) {
                channel.send(msgFrom + ': ' + messageObject.message);
            } else {
                console.log('channel not found', messageObject.channel);
            }
        }
        console.log('received', redischannel, key, messageObject);
    });
});

module.exports = slack;
