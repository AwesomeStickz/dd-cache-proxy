import { Bot, DiscordChannel, DiscordGuildBanAddRemove, DiscordGuildMemberRemove, DiscordGuildRoleDelete, DiscordUnavailableGuild } from '@discordeno/bot';
import { BotWithProxyCache, ProxyCacheTypes, type DeletedRemovalsProps } from './index.js';

export function setupCacheRemovals<B extends Bot>(bot: BotWithProxyCache<ProxyCacheTypes, B>, deletedRemovals: DeletedRemovalsProps) {
    const { CHANNEL_DELETE, GUILD_BAN_ADD, GUILD_DELETE, GUILD_MEMBER_REMOVE, GUILD_ROLE_DELETE, THREAD_DELETE } = bot.handlers;
    const DELETE_REMOVEAL_EXPIRESIN = 5000; // 5 seconds

    bot.handlers.CHANNEL_DELETE = function (_, data, shardId) {
        const payload = data.d as DiscordChannel;
        // HANDLER BEFORE DELETING, BECAUSE HANDLER RUNS TRANSFORMER WHICH RE CACHES
        CHANNEL_DELETE(bot, data, shardId);

        const id = bot.transformers.snowflake(payload.id);

        deletedRemovals.channels.set(id, { expiresIn: Date.now() + DELETE_REMOVEAL_EXPIRESIN }); 
        bot.cache.channels.delete(id);
    };

    bot.handlers.GUILD_DELETE = function (_, data, shardId) {
        const payload = data.d as DiscordUnavailableGuild;
        const id = bot.transformers.snowflake(payload.id);

        // Remove the guild from cache
        bot.cache.options.bulk?.removeGuild?.(id);

        GUILD_DELETE(bot, data, shardId);
    };

    bot.handlers.GUILD_MEMBER_REMOVE = function (_, data, shardId) {
        const payload = data.d as DiscordGuildMemberRemove;
        GUILD_MEMBER_REMOVE(bot, data, shardId);

        bot.cache.members.delete(bot.transformers.snowflake(payload.user.id), bot.transformers.snowflake(payload.guild_id));
    };

    bot.handlers.GUILD_BAN_ADD = function (_, data, shardId) {
        const payload = data.d as DiscordGuildBanAddRemove;
        GUILD_BAN_ADD(bot, data, shardId);

        bot.cache.members.delete(bot.transformers.snowflake(payload.user.id), bot.transformers.snowflake(payload.guild_id));
    };

    bot.handlers.GUILD_ROLE_DELETE = function (_, data, shardId) {
        const payload = data.d as DiscordGuildRoleDelete;
        const id = bot.transformers.snowflake(payload.role_id);

        bot.cache.options.bulk?.removeRole?.(id);

        GUILD_ROLE_DELETE(bot, data, shardId);
    };

    bot.handlers.THREAD_DELETE = function (_, data, shardId) {
        const payload = data.d as DiscordChannel;
        // HANDLER BEFORE DELETING, BECAUSE HANDLER RUNS TRANSFORMER WHICH RE CACHES
        THREAD_DELETE(bot, data, shardId);

        const id = bot.transformers.snowflake(payload.id);

        deletedRemovals.channels.set(id, { expiresIn: Date.now() + DELETE_REMOVEAL_EXPIRESIN }); 
        bot.cache.channels.delete(id);
    };
}
