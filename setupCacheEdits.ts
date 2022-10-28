import { Bot } from 'discordeno';
import { DiscordGuildMemberAdd, DiscordGuildMemberRemove } from 'discordeno/types';
import { BotWithProxyCache, ProxyCacheTypes } from './index.js';

export function setupCacheEdits<B extends Bot>(bot: BotWithProxyCache<ProxyCacheTypes, B>) {
    const { GUILD_MEMBER_ADD, GUILD_MEMBER_REMOVE } = bot.handlers;

    bot.handlers.GUILD_MEMBER_ADD = async function (_, data, shardId) {
        const payload = data.d as DiscordGuildMemberAdd;

        const guildID = bot.transformers.snowflake(payload.guild_id);
        const guild = bot.cache.guilds.memory.get(guildID);

        if (guild) {
            guild.memberCount++;
            await bot.cache.guilds.set(guild);
        }

        GUILD_MEMBER_ADD(bot, data, shardId);
    };

    bot.handlers.GUILD_MEMBER_REMOVE = async function (_, data, shardId) {
        const payload = data.d as DiscordGuildMemberRemove;

        const guildID = bot.transformers.snowflake(payload.guild_id);
        const guild = bot.cache.guilds.memory.get(guildID);

        if (guild) {
            guild.memberCount--;
            await bot.cache.guilds.set(guild);
        }

        GUILD_MEMBER_REMOVE(bot, data, shardId);
    };
}
