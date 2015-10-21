# metahelmbot
A bot for slack that serves as a communication point for other bots. This is absolutely 100% not related to the free Slack integration limit at all. Nope.

All slack messages are added to a redis store. New message ids are published on redis channel 'from-slack'.

Keys are read off the redis channel 'to-slack' and then their corresponding message value is emitted to slack.

### install
`npm install`

### run
1. Copy config.defaults to config.json and fill out settings
2. `node bot`
