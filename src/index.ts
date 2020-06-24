import TwitterBot from "./twitter-bot";
import yargs from "yargs";

(async () => {

  const argv = yargs
    .command("timeline", "Get User Timeline")
    .help()
    .alias("help", "h")
    .argv;

  // default
  if (argv._.length === 0) {
    argv._.push("timeline");
  }

  const bot = new TwitterBot();
  if (argv._.includes("timeline")) {
    await bot.timeline();
  }

})();