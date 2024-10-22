import { Bot, EventHandlers } from '@discordeno/bot';
import { BotWithProxyCache, ProxyCacheTypes } from './index.js';

const ignore = () => {};

export const setupDummyEvents = <T extends ProxyCacheTypes, B extends Bot>(bot: BotWithProxyCache<T, B>) => {
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

    for (const event of eventsRequired) bot.events[event] ??= ignore;
};

/*
    Explanation about the comments for setupDummy functions:
        Handlers: All the handlers that run these transformers.
        Transformers: All the transformers that run these transformers.
    
    Inside the transformers list for a transformer X:
        - A means that transformer X is called by transformer A, means we have to add the events that run A.
        - A (B) means that transformer X is called by transformer A which is called only by transformer B, so we only add the events that run B. This has the following possibilities:
            - A (B): A is called only by B, target B.
            - A (B, C, ...): A is called by only by B and C, target B and C.
            - A (B (C (...))): A is called by B which is called by C, target C.
        - A (REST Only) means that transformer A is only called inside the REST functions, which means that they directly call X, so we can ignore.
        - X (Self) means that X calls itself, so we can ignore.

    The purpose of this is to know what we've already handled and what we still need to handle if we want to update in the future when more events are added/updated.
*/

// Handlers: GUILD_CREATE, GUILD_UPDATE
// Transformers: None
const setupDummyGuildEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildCreate');
    eventsRequired.add('guildUpdate');
};

// Handlers: CHANNEL_CREATE, CHANNEL_DELETE, CHANNEL_UPDATE, THREAD_CREATE, THREAD_DELETE, THREAD_UPDATE, THREAD_LIST_SYNC
// Transformers: Guild, Interaction, Message
const setupDummyChannelEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('channelCreate');
    eventsRequired.add('channelDelete');
    eventsRequired.add('channelUpdate');
    eventsRequired.add('threadCreate');
    eventsRequired.add('threadDelete');
    eventsRequired.add('threadUpdate');
    eventsRequired.add('threadListSync');

    setupDummyGuildEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
};

// Handlers: GUILD_ROLE_CREATE, GUILD_ROLE_UPDATE
// Transformers: Guild, Interaction
const setupDummyRoleEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('roleCreate');
    eventsRequired.add('roleUpdate');

    setupDummyGuildEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
};

// Handlers: GUILD_MEMBER_ADD, GUILD_MEMBER_UPDATE, MESSAGE_REACTION_ADD, TYPING_START
// Transformers: Guild, Interaction, Message, Stage Invite Instance (Invite)
const setupDummyMemberEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildMemberAdd');
    eventsRequired.add('guildMemberUpdate');
    eventsRequired.add('reactionAdd');
    eventsRequired.add('typingStart');

    setupDummyGuildEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
    setupDummyInviteEvents(eventsRequired);
};

// Handlers: GUILD_BAN_ADD, GUILD_BAN_REMOVE, GUILD_MEMBER_ADD, GUILD_MEMBER_REMOVE, GUILD_MEMBER_UPDATE, MESSAGE_REACTION_ADD, READY, USER_UPDATE
// Transformers: Application (Invite), Channel, Emoji, Integration, Interaction, Invite, Member, Message, Presence, Scheduled Event, Sticker    Pack (REST Only), Team (Application (Invite)), Template (REST Only), Webhook (REST Only)
const setupDummyUserEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildBanAdd');
    eventsRequired.add('guildBanRemove');
    eventsRequired.add('guildMemberAdd');
    eventsRequired.add('guildMemberRemove');
    eventsRequired.add('guildMemberUpdate');
    eventsRequired.add('reactionAdd');
    eventsRequired.add('ready');
    eventsRequired.add('botUpdate');

    setupDummyChannelEvents(eventsRequired);
    setupDummyEmojiEvents(eventsRequired);
    setupDummyIntegrationEvents(eventsRequired);
    setupDummyInteractionEvents(eventsRequired);
    setupDummyInviteEvents(eventsRequired);
    setupDummyMemberEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
    setupDummyPresenceEvents(eventsRequired);
    setupDummyScheduledEventEvents(eventsRequired);
};

// Handlers: GUILD_EMOJIS_UPDATE, MESSAGE_REACTION_ADD, MESSAGE_REACTION_REMOVE_EMOJI, MESSAGE_REACTION_REMOVE
// Transformers: Guild, Message, Onboarding (REST Only), Poll (Message)
const setupDummyEmojiEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('guildEmojisUpdate');
    eventsRequired.add('reactionAdd');
    eventsRequired.add('reactionRemoveEmoji');
    eventsRequired.add('reactionRemove');

    setupDummyGuildEvents(eventsRequired);
    setupDummyMessageEvents(eventsRequired);
};

// Handlers: INTEGRATION_CREATE, INTEGRATION_UPDATE
// Transformers: None
const setupDummyIntegrationEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('integrationCreate');
    eventsRequired.add('integrationUpdate');
};

// Handlers: INTERACTION_CREATE
// Transformers: None
const setupDummyInteractionEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('interactionCreate');
};

// Handlers: INVITE_CREATE
// Transformers: None
const setupDummyInviteEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('inviteCreate');
};

// Handlers: MESSAGE_CREATE, MESSAGE_UPDATE
// Transformers: Interaction, Message (Self)
const setupDummyMessageEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('messageCreate');
    eventsRequired.add('messageUpdate');

    setupDummyInteractionEvents(eventsRequired);
};

// Handlers: PRESENCE_UPDATE
// Transformers: Guild
const setupDummyPresenceEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('presenceUpdate');

    setupDummyGuildEvents(eventsRequired);
};

// Handlers: GUILD_SCHEDULED_EVENT_CREATE, GUILD_SCHEDULED_EVENT_DELETE, GUILD_SCHEDULED_EVENT_UPDATE
// Transformers: Invite
const setupDummyScheduledEventEvents = (eventsRequired: Set<keyof EventHandlers>) => {
    eventsRequired.add('scheduledEventCreate');
    eventsRequired.add('scheduledEventDelete');
    eventsRequired.add('scheduledEventUpdate');

    setupDummyInviteEvents(eventsRequired);
};
