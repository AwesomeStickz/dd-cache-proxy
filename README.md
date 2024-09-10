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

## Get guild from cache:

```js
await bot.cache.guilds.get(guildId);
```

Each cache will be in their own property under `bot.cache` and each of them have the following methods: `delete`, `get`, `set`, usage of these should be self explanatory from intellisense. If you cache in memory and need access to the collection directly, you can use `bot.cache.guilds.memory`, this will return a collection.

# **Important Things To Note:**

-   Make sure to include the correct `bot.transformers.desiredProperties` somewhere in your code, this must include at least **all** the properties from `bot.cache.options.desiredProps` for it to cache all those properties you want to cache.
-   It's not recommended to dynamically change `bot.cache.options.cacheInMemory` or `bot.cache.options.cacheOutsideMemory` since it may not cache newly added cache if events for that isn't setup. If you need to do so, you need to manually rerun the `setupDummyEvents` function.
    -   You should also avoid directly replacing `bot.events` (like `bot.events = { ready: ReadyFunction }`) since it'll override the dummy events setup by the cache proxy, which may make it unable to cache data. Instead, assign to individual event properties, like `bot.events.ready = ReadyFunction`, `bot.events.messageCreate = MessageCreateFunction` etc.

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

### `options.sweeper`:

Lets you define options for sweeper. This works for in-memory cache only. For outside memory cache, you should implement your own sweeper.

This provides the following props:

-   `options.sweeper.interval`
-   `options.sweeper.filter`

#### `options.sweeper.interval`:

The interval (in milliseconds) in which the cache sweeper should run.

#### `options.sweeper.filter`:

Lets you provide filter functions to decide which object to remove from cache and which to keep. Defaults to removing nothing from the cache, so you should provide your own filters if you enable cache sweeper.

Note: You can use the `lastInteractedTime` property in the object to implement an NRU (Not Recently Used) cache if you'd like. For example, if you'd like to only remove the members that aren't accessed in the last 15 minutes and isn't the bot member, you can do:

```js
sweeper: {
    // Run the sweeper every 5 minutes
    interval: 300000,
    filter: {
        member: (member) => {
            // Remove member from cache if it hasn't been accessed in the last 15 minutes and if the member isn't bot member
            if (Date.now() - member.lastInteractedTime > 900000 && member.id !== bot.id) return true;
            else return false;
        }
    }
}
```

# Questions / Support:

If you have any questions or require support, feel free to contact me (`@awesomestickz`) in the [discordeno server](https://discord.gg/ddeno).
