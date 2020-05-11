import Twitter from 'twitter-lite';
require('dotenv').config();

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
    this.log('Starting bot.');

    let totalLikes = 0;
    const targetLikes = 5;
    while (totalLikes < targetLikes) {
      const rateLimit = await this.getRateLimit();
      const searchTweetLimits = rateLimit.resources.search['/search/tweets'];
      this.log(`Search limits : ${JSON.stringify(searchTweetLimits)}`);

      if (searchTweetLimits.remaining < 5) {
        this.log(`Out of limits. Waiting a minute to retry later.`); // TODO: wait for exact duration needed
        await this.sleep(60000);
      }

      // Search
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const until = yesterday.toISOString().slice(0, 10);
      const searchResult = await this.search('#100DaysOfCode', 100, until);
      this.log(`Got ${searchResult.statuses.length} statuses from search.`);

      // Find matching tweets
      let count = 0;
      while (true) {
        const s = searchResult.statuses[count];
        const likes = parseInt(s.favorite_count);
        const followers = parseInt(s.user.followers_count);

        // Exclude tweets that are:
        // * retweets
        // * At least 5 minutes old
        // * From users with 1000 followers or less
        // * Have less than 10 likes
        // * Not a reply
        if (!(s.text.match(/^RT/i) || likes > 10 || followers > 100 || s.in_reply_to)) {
          totalLikes ++;
          this.log(`** ${count} - ${s.user.screen_name} ${s.id_str} likes=${s.favorite_count} followers=${followers} ` +
            `in_reply_to=${s.in_reply_to_status_id} created=${s.created_at}\n${s.text}\n`);

          // Like then sleep a little - don't want to like too quick and get in trouble with Twitter big brother
          await this.like(s.id_str);
          const sleepMs = 1000 + Math.floor(Math.random() * 5000); 
          this.log(`Sleeping for ${sleepMs} ms.`);
          await this.sleep(sleepMs);
        }

        count++;
        if (totalLikes >= targetLikes || count >= searchResult.statuses.length) { break; }
      }

      await this.sleep(1000);
    }

    this.log('Exiting bot.');
  }

  async getRateLimit(): Promise<any> {
    const rateLimits = await this.twitClient.get("application/rate_limit_status");
    return rateLimits;
  }

  async search(query: string, count: number = 1, until: string = ''): Promise<any> {

    const result = await this.twitClient.get("search/tweets",
      { q: encodeURI(query), count: count, until: until ? until : undefined });
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