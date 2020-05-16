import Twitter from 'twitter-lite';
import { Tweet } from './models';
import fs from 'fs';
require('dotenv').config();

// TODO: show user avatar next to tweet

class TwitterBot {
  private twitClient: Twitter;

  public constructor(twitClient?: Twitter) {
    this.twitClient = twitClient ||
      new Twitter({
        consumer_key: process.env.consumer_key as string,
        consumer_secret: process.env.consumer_secret as string,
        access_token_key: process.env.access_token_key,
        access_token_secret: process.env.access_token_secret
      });
  }

  async start() {
    const tweets = await this.findTweets();
    await this.genHtmlReport(tweets);
  }

  /** Find tweets to review */
  async findTweets(): Promise<Tweet[]> {
    const tweets: Tweet[] = [];

    let numTweetsFound = 0;
    const numTweetsToFind = 20; // TODO randomize
    let maxId: string | undefined;
    while (numTweetsFound < numTweetsToFind) {
      const rateLimit = await this.getRateLimit();
      const searchTweetLimits = rateLimit.resources.search['/search/tweets'];
      this.log(`Search limits : ${JSON.stringify(searchTweetLimits)}`);

      if (searchTweetLimits.remaining < 5) {
        this.log(`Out of limits. Waiting a minute to retry later.`); // TODO: wait for exact duration needed
        await this.sleep(60000);
        continue;
      }

      // Search
      const searchResult = await this.search('#100DaysOfCode', 100, maxId);
      this.log(`Got ${searchResult.statuses.length} statuses from search.`);

      // Find matching tweets
      let count = 0;      
      while (true) {
        const s = searchResult.statuses[count];
        const likes = parseInt(s.favorite_count);
        const followers = parseInt(s.user.followers_count);
        const userAdded = tweets.find((t) => s.user.screen_name === t.userScreenName);
        maxId = s.id_str;

        const isRetweet = s.text.match(/^RT/i);
        const textOnly = s.text.replace(/\#[\w\d]+/gi, '');
        const isProgressReport = textOnly.match(/(d|day)\s*\d{1,3}\s+/i)

        // Exclude tweets that are:
        // * retweets
        // * From users with more than 100
        // * Have more than than 10 likes
        // * A reply
        // * From a user I already liked in the past week
        if (isProgressReport
          && !isRetweet && likes < 10 && followers < 1000
          && ! s.in_reply_to
          && ! userAdded
          ) {
          numTweetsFound ++;
          this.log(`** ${numTweetsFound} - ${s.user.screen_name} ${s.id_str} likes=${s.favorite_count} followers=${followers} ` +
            `in_reply_to=${s.in_reply_to_status_id} created=${s.created_at}\n${s.text}\n`);

          const tweet = new Tweet();
          tweet.id = s.id_str;
          tweet.created = s.created_at;
          tweet.likes = likes;
          tweet.userScreenName = s.user.screen_name;
          tweet.userFollowers = followers;
          tweet.userFriends = s.user.friends_count;
          tweet.text = s.text;
          tweets.push(tweet);

          // TODO
          // // Like then sleep a little - don't want to like too quick and get in trouble with Twitter big brother
          // await this.like(s.id_str);
          // const sleepMs = 1000 + Math.floor(Math.random() * 5000); 
          // this.log(`Sleeping for ${sleepMs} ms.`);
          // await this.sleep(sleepMs);
        }

        count++;
        if (numTweetsFound >= numTweetsToFind || count >= searchResult.statuses.length) { break; }
      }

      await this.sleep(1000);
    }

    return tweets;
  }

  async getRateLimit(): Promise<any> {
    const rateLimits = await this.twitClient.get("application/rate_limit_status");
    return rateLimits;
  }

  /** Generate an HTML report of tweets to review */
  async genHtmlReport(tweets: Tweet[]): Promise<void> {
    let template = fs.readFileSync('src/template.html', 'utf-8');

    let content = '';
    content += '<ul>';
    for (let i=0; i<tweets.length; i++) {
      const t = tweets[i];
      content += `<li>${t.userScreenName}"`;
      content += ` (${t.userFriends} / ${t.userFollowers}) <a href="https://twitter.com/${t.userScreenName}/status/${t.id}" class="tweet" target="_blank">${t.text}</a></li>`;
    };
    content += '</ul>';

    const html = template.replace(/\$CONTENT\$/gi, content);

    const path = 'lib/report.html';
    fs.writeFileSync(path, html, {encoding: 'utf8'});
  }

  async search(query: string, count: number = 1, maxId: string = ''): Promise<any> {
    const result = await this.twitClient.get("search/tweets",
      { q: encodeURI(query), count: count, max_id: maxId ? maxId : undefined, lang: 'en'});
    return result;
  }

  async like(tweetId: string): Promise<void> {
    try {
      await this.twitClient.post("favorites/create", { id: tweetId });
    }
    catch (error) {
      console.error(error);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(msg: any) {
    console.log(msg);
  }
}

export default TwitterBot;