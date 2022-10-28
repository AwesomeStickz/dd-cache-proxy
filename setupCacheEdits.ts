import { Bot } from 'discordeno';
import { DiscordGuildMemberAdd, DiscordGuildMemberRemove } from 'discordeno/types';
import { BotWithProxyCache, ProxyCacheTypes } from './index.js';

export function setupCacheEdits<B extends Bot>(bot: BotWithProxyCache<ProxyCacheTypes, B>) {
    const { GUILD_MEMBER_ADD, GUILD_MEMBER_REMOVE } = bot.handlers;

    bot.handlers.GUILD_MEMBER_ADD = function (_, data, shardId) {
        const payload = data.d as DiscordGuildMemberAdd;

        const guildID = bot.transformers.snowflake(payload.guild_id);
        const guild = bot.cache.guilds.memory.get(guildID);
        // Update in memory cache
        if (guild) guild.memberCount++;
        // Update non-memory cache
        bot.cache.guilds.get(guildID).then((g) => {
            if (g) {
                g.memberCount++;
                bot.cache.guilds.set(g);
            }
        });

        GUILD_MEMBER_ADD(bot, data, shardId);
    };

    bot.handlers.GUILD_MEMBER_REMOVE = function (_, data, shardId) {
        const payload = data.d as DiscordGuildMemberRemove;

        const guildID = bot.transformers.snowflake(payload.guild_id);
        const guild = bot.cache.guilds.memory.get(guildID);
        // Update in memory cache
        if (guild) guild.memberCount--;
        // Update non-memory cache
        bot.cache.guilds.get(guildID).then((g) => {
            if (g) {
                g.memberCount--;
                bot.cache.guilds.set(g);
            }
        });

        GUILD_MEMBER_REMOVE(bot, data, shardId);
    };
}
