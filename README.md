# Discordeno Cache Proxy (dd-cache-proxy)

A simple, easy-to-use, highly customizable cache proxy for [discordeno](https://github.com/discordeno) which supports in-memory and outside memory caching with custom properties you wish to cache.

Initially forked from [cache-proxy](https://github.com/discordeno/cache-proxy), but modified to be a proper, minimal, non-bloated cache proxy that aims to fit larger bots.

Used In:

-   [Giveaway Boat](https://giveaway.boats)
-   Contact [me](https://github.com/AwesomeStickz#contact-me) if you'd like to add your bot here!

## Example Usage:

```js
import { createProxyCache } from 'dd-cache-proxy';
import { createBot, Bot, Intents } from '@discordeno/bot';

// Create a function for easier use and cleaner code.
const getProxyCacheBot = (bot: Bot) =>
    createProxyCache(bot, {
        // Define what properties of individual cache you wish to cache. Caches no props by default. Or you can use the `undesiredProps` prop to reverse the behavior of `desiredProps`.
        desiredProps: {
            // Example props that are cached in channels and other cache. Accepts an array of props of the cache. All props are optional.
            guilds: ['channels', 'icon', 'id', 'name', 'roles'],
            users: ['avatar', 'id', 'username'],
        },
        // Define what to cache in memory. All props are optional except `default`. By default, all props inside `cacheInMemory` are set to `true`.
        cacheInMemory: {
            // Whether or not to cache guilds.
            guilds: true,
            channels: true,
            // Default value for the properties that are not provided inside `cacheInMemory`.
            default: false,
        },
        // Define what to cache outside memory. All props are optional except `default`. By default, all props inside `cacheOutsideMemory` are set to `false`.
        cacheOutsideMemory: {
            // Whether or not to cache channels.
            channels: false,
            roles: false,
            // Default value for the properties that are not provided inside `cacheOutsideMemory`.
            default: true,
        },
        // Function to get an item from outside cache. `getItem`, `setItem`, `removeItem` must be provided if you cache outside memory, can be omitted if you don't store outside memory.
        setItem: (table, item) => {
            if (table === 'channels') {
                // Custom code to store data into your cache outside memory, say redis or a database or whichever you use.
            }
        },
    });

// Pass the created bot object to `getProxyCacheBot` so it can add the cache proxy to it.
const bot = getProxyCacheBot(
    // Create the bot object.
    createBot({
        token,
        intents: Intents.Guilds,
    })
);
```

Make sure to include the correct `client.transformers.desiredProperties` somewhere in your code.

## Get guild from cache:

```js
await bot.cache.guilds.get(guildId);
```

Each cache will be in their own property under `bot.cache` and each of them have the following methods: `delete`, `get`, `set`, usage of these should be self explanatory from intellisense. If you cache in memory and need access to the collection directly, you can use `bot.cache.guilds.memory`, this will return a collection.

# Useful Options To Note:

### `options.shouldCache`:

This is a property with which you can conditionally cache only certain objects and leave out the others. For example, if you only want to cache guild channels, you can simply do:

```js
shouldCache: {
    channel: async (channel) => {
        if (channel.guildId) return true;
        else return false;
    },
}
```

### `options.bulk`:

Lets you define how to deal with bulk removal of data. Useful to provide when you use cache outside memory. For example, if you store channels individually and separately from a guild, say in a database, when a guild is deleted, all of those channels will be deleted individually in individual queries, which is not ideal, so you can use `options.bulk.removeGuild` to delete the guild and all the channels related to that guild as one query or so, whichever gives better performance.

This provides the following props: (should be self explanatory with intellisense)

-   `options.bulk.removeGuild`
-   `options.bulk.removeRole`
-   `options.bulk.replaceInternalBulkRemover` - To set props under this prop to tell the cache proxy whether or not to run internal bulk removers.

### `options.maxCacheInactiveTime`:

Lets you provide the amount of inactive time (in milliseconds) for a cached object after which it should be removed from cache. Useful if for example you want to cache only active guilds.

### `options.cacheSweepInterval`:

Lets you define the interval (in milliseconds) in which the cache sweeper should check for inactive objects based on maxCacheInactiveTime to clear them.
