import { Bot, EventHandlers } from '@discordeno/bot';
import { BotWithProxyCache, ProxyCacheTypes } from './index.js';

export const setupDummyEvents = <B extends Bot>(bot: BotWithProxyCache<ProxyCacheTypes, B>) => {
    const eventsRequired = new Set<keyof EventHandlers>();
    const { cacheInMemory, cacheOutsideMemory } = bot.cache.options || {};

    // Guild
    if (cacheInMemory?.guilds || cacheOutsideMemory?.guilds) setupDummyGuildEvents(eventsRequired);
    // Channel
    if (cacheInMemory?.channels || cacheOutsideMemory?.channels) setupDummyChannelEvents(eventsRequired);
    // Role
    if (cacheInMemory?.roles || cacheOutsideMemory?.roles) setupDummyRoleEvents(eventsRequired);
    // Member
    if (cacheInMemory?.members || cacheOutsideMemory?.members) setupDummyMemberEvents(eventsRequired);
    // User
    if (cacheInMemory?.users || cacheOutsideMemory?.users) setupDummyUserEvents(eventsRequired);

    const ignore = () => {};

    for (const event of eventsRequired) bot.events[event] ??= ignore;
};

const setupDummyGuildEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildCreate');
    eventsRequired.add('guildDelete');
};

const setupDummyChannelEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('channelCreate');
    eventsRequired.add('channelDelete');
    eventsRequired.add('channelUpdate');
    eventsRequired.add('threadCreate');
    eventsRequired.add('threadDelete');
    eventsRequired.add('threadUpdate');
    eventsRequired.add('threadListSync');

    setupDummyGuildEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
};

const setupDummyRoleEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('roleCreate');
    eventsRequired.add('roleUpdate');

    setupDummyGuildEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
};

const setupDummyMemberEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildMemberAdd');
    eventsRequired.add('guildMemberRemove');
    eventsRequired.add('guildMemberUpdate');

    setupDummyGuildEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
    setupDummyInviteEvents(eventsRequired);
};

const setupDummyUserEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildBanAdd');
    eventsRequired.add('guildBanRemove');
    eventsRequired.add('guildMemberAdd');
    eventsRequired.add('guildMemberRemove');
    eventsRequired.add('guildMemberUpdate');
    eventsRequired.add('reactionAdd');
    eventsRequired.add('ready');
    eventsRequired.add('botUpdate');

    setupDummyEmojiEvents(eventsRequired);
    setupDummyIntegrationEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
    setupDummyInviteEvents(eventsRequired);
    setupDummyMemberEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
    setupDummyPresenceEvents(eventsRequired);
    setupDummyScheduledEventEvents(eventsRequired);
    setupDummyStickerEvents(eventsRequired);
};

const setupDummyEmojiEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('reactionAdd');
    eventsRequired.add('reactionRemoveEmoji');
    eventsRequired.add('reactionRemove');

    setupDummyGuildEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
};

const setupDummyIntegrationEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('integrationCreate');
    eventsRequired.add('integrationUpdate');
};
const setupDummyInteractionEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('interactionCreate');
};

const setupDummyInviteEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('inviteCreate');
};

const setupDummyMessageEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('messageCreate');
    eventsRequired.add('messageUpdate');

    setupDummyInteractionEvents(eventsRequired);
};

const setupDummyPresenceEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('presenceUpdate');

    setupDummyGuildEvents(eventsRequired);
};

const setupDummyScheduledEventEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('scheduledEventCreate');
    eventsRequired.add('scheduledEventDelete');
    eventsRequired.add('scheduledEventUpdate');

    setupDummyInviteEvents(eventsRequired);
};

const setupDummyStickerEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildStickersUpdate');

    setupDummyGuildEvents(eventsRequired);
};
