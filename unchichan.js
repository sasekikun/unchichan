if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const Botkit = require('botkit');

const controller = Botkit.slackbot({
    debug: true,
});


const bot = controller.spawn({
    token: process.env.token
})


bot.startRTM( (err, bot, payload) => {
    // 初期処理
    if (err) {
        throw new Error('Could not connect to Slack');
    }
});

const CronJobs = require('./cron_jobs')
new CronJobs().init(bot)

const fs = require('fs');

controller.hears(['^lgtm$'], 'direct_message,direct_mention,mention', (bot, message) => {
    const options = {
        url: 'http://www.lgtm.in/g',
        method: 'GET',
        rejectUnauthorized: false,
        json: true
    };
    const request = require('request');
    request(options, (error, response, json) => {

        try {
            bot.replyWithTyping(message, `${json.imageUrl}`);
        } catch (e) {
            bot.replyWithTyping(message, "探すの失敗しちゃいました");
            console.log("lgtm error",e);
        }

    });
});

controller.hears(['^hello$', '^hi$', '^こんにちは$'], 'direct_message,direct_mention,mention', (bot, message) => {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'poop',
    }, (err, res) => {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, (err, user) => {
        if (user && user.name) {
            bot.replyWithTyping(message, `こんにちは ${user.name}!!`);
        } else {
            bot.replyWithTyping(message, 'Hello.');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)', '(.*)と呼んで'], 'direct_message,direct_mention,mention', (bot, message) => {
    const name = message.match[1];
    controller.storage.users.get(message.user, (err, user) => {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        if (name.length >= 4 && Math.random() > 0.8) {
            user.name = name.charAt(Math.floor(Math.random() * name.length));
            controller.storage.users.save(user, (err, id) => {
                bot.replyWithTyping(message, `贅沢な名だねぇ。 今からおまえの名前は${user.name}だ。いいかい、${user.name}だよ。分かったら返事をするんだ、${user.name}！！`);
            });
        } else {
            user.name = name;
            controller.storage.users.save(user, (err, id) => {
                bot.replyWithTyping(message, `OK. 君は今から ${user.name} だ.`);
            });
        }
    });
});

controller.hears(['what is my name', 'who am i', '私は誰'], 'direct_message,direct_mention,mention', (bot, message) => {

    controller.storage.users.get(message.user, (err, user) => {
        if (user && user.name) {
            bot.replyWithTyping(message, `君の名前は ${user.name}`);
        } else {
            bot.startConversation(message, (err, convo) => {
                if (!err) {
                    convo.say('僕は君の名前を知らない');
                    convo.ask('なんて呼んで欲しい？', (response, convo) => {
                        convo.ask(`${response.text}って呼ぶね?`, [
                            {
                                pattern: 'yes',
                                callback: (response, convo) => {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: (response, convo) => {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: (response, convo) => {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', (convo) => {
                        if (convo.status === 'completed') {
                            bot.replyWithTyping(message, '登録すっけんちょっと待っとって。');

                            controller.storage.users.get(message.user, (err, user) => {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, (err, id) => {
                                    bot.replyWithTyping(message, `登録終わったわー。今から${user.name}って呼ぶけんね。`);
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.replyWithTyping(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});


controller.hears(['流す'], 'direct_message,direct_mention,mention', (bot, message) => {

    bot.startConversation(message, (err, convo) => {

        convo.ask('本当に流すの？', [
            {
                pattern: bot.utterances.yes,
                callback: (response, convo) => {
                    convo.say('またどこかで、会いましょう。さようなら。');
                    convo.next();
                    setTimeout( () =>{
                        process.exit();
                    }, 3000);
                }
            },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: (response, convo) => {
                    convo.say('*Phew!*');
                    convo.next();
                }
            }
        ]);
    });
});


controller.hears(['sgu', 'SGU'], 'direct_message,direct_mention,mention', (bot, message) => {

    controller.storage.users.get(message.user, (err, user) => {
        const sgu = fs.readFileSync('resources/sgu.txt', 'utf-8');

        try {
            bot.replyWithTyping(message, "```\n" + sgu + "```\n");
        } catch (e) {
            bot.replyWithTyping(message, "失敗");
        }

    });

});


if (process.env.token_giphy) {

    controller.hears(['^gif .*$'], 'direct_message,direct_mention,mention', (bot, message) => {

        const keyword = message.match[0].replace(/^gif /, '');
        keyword.replace(/ /, '+');

        const options = {
            url: 'http://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=' + process.env.token_giphy,
            method: 'GET'
        };

        const request = require('request');

        request(options, (error, response, body) => {

            try {

                const data = JSON.parse(body).data;

                if (data.length !== 0) {

                    const index = Math.floor(Math.random() * data.length);

                    bot.replyWithTyping(message, data[index].images.downsized.url);
                } else {

                    bot.replyWithTyping(message, "そんなものはない");
                }
            } catch (e) {
                bot.replyWithTyping(message, "なんらかのエラー");
            }
        });
    });
}

if (process.env.token_github) {

    const GitHubApi = require('github')

    const github = new GitHubApi({
        debug: true
    })

    github.authenticate({
        type: 'token',
        token: process.env.token_github
    });

    controller.hears('今日やること', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {

        github.issues.getForOrg({

            org: 'sasekikun',
            filter: 'all'
        }).then(res => {

            const select = Math.floor(Math.random() * res.data.length);
            const title = res.data[select].title;
            const url = res.data[select].html_url;

            if (title.length) {
                bot.reply(message, title + "をやろう\n" + url);
            } else {
                bot.reply(message, 'どうしよっか。。。');
            }
        });
    });
}


if (process.env.token_kaiwa) {

    controller.hears(['(.*)'], 'direct_message,direct_mention,mention', (bot, message) => {

        const comment = message.match[1];

        controller.storage.users.get(message.user, (err, user) => {

            if (!user) {
                user = {
                    id: message.user,
                };
            }

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const json = {
                "utt": comment,
                "place": "福岡",
            };

            if (user.name) {
                json.nickname = user.name;
            }
            if (user.context) {
                json.context = user.context;
            }

            const options = {
                url: 'https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=' + process.env.token_kaiwa,
                method: 'POST',
                headers: headers,
                json: json
            };

            const request = require('request');

            request(options, (error, response, json) => {

                try {

                    bot.replyWithTyping(message, `${json.utt}`);
                    user.context = json.context;

                    controller.storage.users.save(user, (err, id) => {
                    });
                } catch (e) {

                    console.log("error:", e);
                    bot.replyWithTyping(message, "発言に失敗しちゃいました");
                }
            });
        });
    });
}
