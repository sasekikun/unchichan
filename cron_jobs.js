class CronJobs {

    constructor() {

        this.CronJob = require('cron').CronJob;
    }

    init(bot) {

        const JapaneseHolidays = require('japanese-holidays');
        const questChannel = '#quest_daily'

        new this.CronJob({

            cronTime: '00 30 9 * * 1-5',

            onTick: function () {

                const today = new Date();
                const holiday = JapaneseHolidays.isHoliday(today);

                if (holiday) {
                    return;
                }

                bot.say({
                    channel: questChannel,
                    text: 'デイリークエスト'
                });
            },
            start: true,
            timeZone: 'Asia/Tokyo'
        });

        new this.CronJob({

            cronTime: '00 30 17 * * 1-5',

            onTick: function () {

                const today = new Date();
                const holiday = JapaneseHolidays.isHoliday(today);

                if (holiday) {
                    return;
                }

                bot.say({
                    channel: questChannel,
                    text: '本日達成したクエスト'
                });

                bot.say({
                    channel: questChannel,
                    text: '次回予告'
                });
            },
            start: true,
            timeZone: 'Asia/Tokyo'
        });

        new this.CronJob({

            cronTime: '00 00 18 * * 0-4',

            onTick: () => {

                const now = new Date();
                const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                const holiday = JapaneseHolidays.isHoliday(tomorrow);

                if (holiday) {
                    bot.say({
                        channel: 'programmer',
                        text: "明日は " + holiday + " でお休みだよ！やったね！"
                    });
                }

            },
            start: true,
            timeZone: 'Asia/Tokyo'
        });

    }
}

module.exports = CronJobs
