import TwitterBot from "./twitter-bot";

// TODO: Logging package

(async () => {
  const bot = new TwitterBot();
  await bot.start();
})();