import TwitterBot from './twitter-bot';
import Twitter from 'twitter-lite';
import {mockSearchResult} from './mocks';

jest.mock("twitter-lite", () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn((endpoint) => {
        switch (endpoint) {
          case "application/rate_limit_status":
            return {
              resources: {
                friends: { "/friends/list": { remaining: 5 } },
                followers: { "/followers/list": { remaining: 5 } }
              }
            };
          case "search/tweets": {
            return mockSearchResult;
          }
        }
      }),
      post: jest.fn((endpoint, args) => {
        console.log("POST " + JSON.stringify(args));
        return;
      })      
    };
  });
});

describe('TwitterBot', () => {
  let target: TwitterBot;

  beforeEach(() => {
    const twitterClient = new Twitter({
      consumer_key: '1', consumer_secret: '2', access_token_key: '3', access_token_secret: '4'
    });
    target = new TwitterBot(twitterClient);
  })

  test("getRateLimit returns correct data", async () => {
    const result = await target.getRateLimit();
    expect(result.resources).toBeDefined();
  });

  it("can do a search", async () => {
    const result = await target.search('test');
    expect(result.statuses.length).toBe(2);
  });

  it("can like a tweet", async () => {
    const tweetId = "12345";
    await target.like(tweetId);
  });

})