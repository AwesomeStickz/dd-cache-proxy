import { BigString, Bot, Channel, Collection, Guild, GuildToggles, Member, Role, User } from '@discordeno/bot';
import { iconHashToBigInt } from '@discordeno/utils';

import { setupCacheEdits } from './setupCacheEdits.js';
import { setupCacheRemovals } from './setupCacheRemovals.js';

const pendingGuildsData = new Collection<
    bigint,
    {
        channels?: Collection<bigint, Channel>;
        members?: Collection<bigint, Member>;
        roles?: Collection<bigint, Role>;
    }
>();

export interface ProxyCacheProps<T extends ProxyCacheTypes> {
    cache: {
        options: CreateProxyCacheOptions;
        guilds: {
            memory: Collection<bigint, T['guild']>;
            get: (id: bigint) => Promise<T['guild'] | undefined>;
            set: (value: T['guild']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        channels: {
            guildIDs: Collection<bigint, bigint>;
            memory: Collection<bigint, T['channel']>;
            get: (id: bigint) => Promise<T['channel'] | undefined>;
            set: (value: T['channel'], currentTry?: number) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        roles: {
            guildIDs: Collection<bigint, bigint>;
            get: (id: bigint) => Promise<T['role'] | undefined>;
            set: (value: T['role'], currentTry?: number) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        members: {
            get: (id: bigint, guildId: bigint) => Promise<T['member'] | undefined>;
            set: (value: T['member'], currentTry?: number) => Promise<void>;
            delete: (id: bigint, guildId: bigint) => Promise<void>;
        };
        users: {
            memory: Collection<bigint, T['user']>;
            get: (id: bigint) => Promise<T['user'] | undefined>;
            set: (value: T['user']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
    };
}

export interface DeletedRemovalsProps {
    channels: Collection<bigint, {
        expiresIn: number;
    }>;
}

export type BotWithProxyCache<T extends ProxyCacheTypes, B extends Bot = Bot> = Omit<B, 'cache'> & ProxyCacheProps<T>;

export function createProxyCache<T extends ProxyCacheTypes<boolean> = ProxyCacheTypes, B extends Bot = Bot>(rawBot: B, options: CreateProxyCacheOptions): BotWithProxyCache<T, B> {
    // @ts-ignore why is this failing?
    const bot = rawBot as BotWithProxyCache<T, B>;

    // @ts-ignore
    bot.cache = { options };

    if (!bot.cache.options.cacheInMemory) bot.cache.options.cacheInMemory = { default: true };
    if (!bot.cache.options.cacheOutsideMemory) bot.cache.options.cacheOutsideMemory = { default: false };

    const cacheInMemoryDefault = bot.cache.options.cacheInMemory.default;
    const cacheOutsideMemoryDefault = bot.cache.options.cacheOutsideMemory.default;

    bot.cache.options.cacheInMemory = {
        guilds: cacheInMemoryDefault,
        users: cacheInMemoryDefault,
        channels: cacheInMemoryDefault,
        members: cacheInMemoryDefault,
        roles: cacheInMemoryDefault,
        ...bot.cache.options.cacheInMemory,
    };

    bot.cache.options.cacheOutsideMemory = {
        guilds: cacheOutsideMemoryDefault,
        users: cacheOutsideMemoryDefault,
        channels: cacheOutsideMemoryDefault,
        members: cacheOutsideMemoryDefault,
        roles: cacheOutsideMemoryDefault,
        ...bot.cache.options.cacheOutsideMemory,
    };

    // Default Max Cache Inactive Time to Infinity
    if (!bot.cache.options.maxCacheInactiveTime) bot.cache.options.maxCacheInactiveTime = -1;
    // Default Cache Sweep Interval to 5 minutes
    if (!bot.cache.options.cacheSweepInterval) bot.cache.options.cacheSweepInterval = 1000 * 60 * 5;

    const internalBulkRemover = {
        removeRole: async function (id: bigint) {
            const guildID = bot.cache.roles.guildIDs.get(id);
            if (guildID) {
                // Get the guild if its in cache
                const guild = bot.cache.guilds.memory.get(guildID);
                if (guild) {
                    // if roles are stored inside the guild remove it
                    guild.roles?.delete(id);
                    // Each mem who has this role needs to be edited and the role id removed
                    guild.members?.forEach((member: { roles: bigint[] }) => {
                        if (member.roles?.includes(id)) member.roles = member.roles.filter((roleID: bigint) => roleID !== id);
                    });
                }
            }

            bot.cache.roles.guildIDs.delete(id);
        },
        removeGuild: async function (id: bigint) {
            // Remove from memory
            bot.cache.guilds.memory.delete(id);

            // Remove any associated channels
            bot.cache.channels.memory.forEach((channel) => {
                if (channel.guildId === id) {
                    bot.cache.channels.memory.delete(channel.id);
                    bot.cache.channels.guildIDs.delete(channel.id);
                }
            });
        },
    };

    if (!bot.cache.options.bulk) bot.cache.options.bulk = {};

    // Get bulk removers passed by user, data about which internal removers to replace
    const { removeGuild, removeRole } = bot.cache.options.bulk;
    const { replaceInternalBulkRemover } = bot.cache.options.bulk;

    // If user passed bulk.removeRole else if replaceInternalBulkRemover.role is not set to true
    if (removeRole || !replaceInternalBulkRemover?.role) {
        bot.cache.options.bulk.removeRole = async function (id) {
            // If replaceInternalBulkRemover.role is not set to true, run internal role bulk remover
            if (!replaceInternalBulkRemover?.role) await internalBulkRemover.removeRole(id);
            // If user passed bulk.removeRole, run passed bulk remover
            await removeRole?.(id);
        };
    }

    // If user passed bulk.removeGuild else if replaceInternalBulkRemover.guild is not set to true
    if (removeGuild || !replaceInternalBulkRemover?.guild) {
        bot.cache.options.bulk.removeGuild = async function (id) {
            // If replaceInternalBulkRemover.guild is not set to true, run internal guild bulk remover
            if (!replaceInternalBulkRemover?.guild) await internalBulkRemover.removeGuild(id);
            // If user passed bulk.removeGuild, run passed bulk remover
            await removeGuild?.(id);
        };
    }

    bot.cache.guilds = {
        memory: new Collection<bigint, T['guild']>(),
        get: async function (id: BigString): Promise<T['guild'] | undefined> {
            // Force into bigint form
            const guildID = BigInt(id);

            // If available in memory, use it.
            if (options.cacheInMemory?.guilds) {
                const guild = bot.cache.guilds.memory.get(guildID);
                if (guild) {
                    guild.lastInteractedTime = Date.now();

                    return guild;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.guilds || !options.getItem) return;

            const stored = await options.getItem<T['guild']>('guilds', guildID);

            if (stored) stored.lastInteractedTime = Date.now();
            if (stored && options.cacheInMemory?.guilds) bot.cache.guilds.memory.set(guildID, stored);

            return stored;
        },
        set: async function (guild: T['guild']): Promise<void> {
            // Should this be cached or not?
            if (options.shouldCache?.guild && !(await options.shouldCache.guild(guild))) return;

            guild.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.guilds) bot.cache.guilds.memory.set(guild.id, guild);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.guilds) if (options.setItem) await options.setItem('guilds', guild);
        },
        delete: async function (id: BigString): Promise<void> {
            // Force id to bigint
            const guildID = BigInt(id);
            // Remove from memory
            bot.cache.guilds.memory.delete(guildID);
            // Remove from non-memory cache
            await options.bulk?.removeGuild?.(guildID);
        },
    };

    bot.cache.users = {
        memory: new Collection<bigint, T['user']>(),
        get: async function (id: BigString): Promise<T['user'] | undefined> {
            // Force into bigint form
            const userID = BigInt(id);

            // If available in memory, use it.
            if (options.cacheInMemory?.users) {
                const user = bot.cache.users.memory.get(userID);
                if (user) {
                    if (user.id !== bot.id) user.lastInteractedTime = Date.now();

                    return user;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.users || !options.getItem) return;

            const stored = await options.getItem<T['user']>('users', userID);

            if (stored && stored.id !== bot.id) stored.lastInteractedTime = Date.now();
            if (stored && options.cacheInMemory?.users) bot.cache.users.memory.set(userID, stored);

            return stored;
        },
        set: async function (user: T['user']): Promise<void> {
            if (options.shouldCache?.user && !(await options.shouldCache.user(user))) return;

            if (user.id !== bot.id) user.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.users) bot.cache.users.memory.set(user.id, user);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.users) if (options.setItem) await options.setItem('users', user);
        },
        delete: async function (id: BigString): Promise<void> {
            // Force id to bigint
            const userID = BigInt(id);
            // Remove from memory
            bot.cache.users.memory.delete(userID);
            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('users', userID);
        },
    };

    bot.cache.roles = {
        guildIDs: new Collection<bigint, bigint>(),
        get: async function (id: BigString): Promise<T['role'] | undefined> {
            // Force into bigint form
            const roleID = BigInt(id);

            // If available in memory, use it.
            if (options.cacheInMemory?.roles) {
                // If guilds are cached, roles will be inside them
                if (options.cacheInMemory?.guilds) {
                    const guildID = bot.cache.roles.guildIDs.get(roleID);
                    if (guildID) {
                        const role = bot.cache.guilds.memory.get(guildID)?.roles?.get(roleID);
                        if (role) return role;
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.roles || !options.getItem) return;

            const stored = await options.getItem<T['role']>('roles', roleID);
            if (stored && options.cacheInMemory?.roles) bot.cache.roles.set(stored);
            return stored;
        },
        set: async function (role: T['role']): Promise<void> {
            if (options.shouldCache?.role && !(await options.shouldCache.role(role))) return;

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.roles) {
                if (role.guildId) bot.cache.roles.guildIDs.set(role.id, role.guildId);

                if (options.cacheInMemory?.guilds) {
                    const guildID = bot.cache.roles.guildIDs.get(role.id);
                    if (guildID) {
                        const guild = bot.cache.guilds.memory.get(guildID);
                        if (guild) guild.roles.set(role.id, role);
                        else {
                            const pendingGuild = pendingGuildsData.get(guildID);
                            if (!pendingGuild) pendingGuildsData.set(guildID, { roles: new Collection() });

                            pendingGuildsData.get(guildID)?.roles?.set(role.id, role);
                        }
                    } else console.warn(`[CACHE] Can't cache role(${role.id}) since guild.roles is enabled but a guild id was not found.`);
                }
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.roles) if (options.setItem) await options.setItem('roles', role);
        },
        delete: async function (id: BigString): Promise<void> {
            // Force id to bigint
            const roleID = BigInt(id);
            // Remove from memory
            bot.cache.guilds.memory.get(bot.cache.roles.guildIDs.get(roleID)!)?.roles?.delete(roleID);
            bot.cache.roles.guildIDs.delete(roleID);
            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('roles', roleID);
        },
    };

    bot.cache.members = {
        get: async function (id: BigString, guildId: BigString): Promise<T['member'] | undefined> {
            // Force into bigint form
            const memberID = BigInt(id);
            const guildID = BigInt(guildId);

            // If available in memory, use it.
            if (options.cacheInMemory?.members) {
                // If guilds are cached, members will be inside them
                if (options.cacheInMemory?.guilds) {
                    const member = bot.cache.guilds.memory.get(guildID)?.members?.get(memberID);
                    if (member) return member;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.members || !options.getItem) return;

            const stored = await options.getItem<T['member']>('members', memberID, guildID);
            if (stored && options.cacheInMemory?.members) bot.cache.members.set(stored);
            return stored;
        },
        set: async function (member: T['member']): Promise<void> {
            if (options.shouldCache?.member && !(await options.shouldCache.member(member))) return;


            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.members) {
                if (options.cacheInMemory?.guilds) {
                    if (member.guildId) {
                        const guild = bot.cache.guilds.memory.get(member.guildId);
                        if (guild) guild.members.set(member.id, member);
                        else {
                            const pendingGuild = pendingGuildsData.get(member.guildId);
                            if (!pendingGuild) pendingGuildsData.set(member.guildId, { members: new Collection() });

                            pendingGuildsData.get(member.guildId)?.members?.set(member.id, member);
                        }
                    } else console.warn(`[CACHE] Can't cache member(${member.id}) since guild.members is enabled but a guild id was not found.`);
                }
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.members) if (options.setItem) await options.setItem('members', member);
        },
        delete: async function (id: BigString, guildId: BigString): Promise<void> {
            // Force id to bigint
            const memberID = BigInt(id);
            const guildID = BigInt(guildId);

            // Remove from memory
            bot.cache.guilds.memory.get(guildID)?.members?.delete(memberID);
            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('members', memberID, guildID);
        },
    };

    bot.cache.channels = {
        guildIDs: new Collection<bigint, bigint>(),
        memory: new Collection<bigint, T['channel']>(),
        get: async function (id: BigString): Promise<T['channel'] | undefined> {
            // Force into bigint form
            const channelID = BigInt(id);

            // If available in memory, use it.
            if (options.cacheInMemory?.channels) {
                // If guilds are cached, channels will be inside them
                if (options.cacheInMemory?.guilds) {
                    const guildID = bot.cache.channels.guildIDs.get(channelID);
                    if (guildID) {
                        const channel = bot.cache.guilds.memory.get(guildID)?.channels?.get(channelID);
                        if (channel) return channel;
                    } else {
                        // Return from cache.channels if this channel isn't in a guild
                        const channel = bot.cache.channels.memory.get(channelID);
                        if (channel) {
                            channel.lastInteractedTime = Date.now();

                            return channel;
                        }
                    }
                } else {
                    const channel = bot.cache.channels.memory.get(channelID);
                    if (channel) {
                        channel.lastInteractedTime = Date.now();

                        return channel;
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.channels || !options.getItem) return;

            const stored = await options.getItem<T['channel']>('channels', channelID);

            if (stored && !stored.guildId) stored.lastInteractedTime = Date.now();
            if (stored && options.cacheInMemory?.channels) bot.cache.channels.memory.set(channelID, stored);

            return stored;
        },
        set: async function (channel: T['channel']): Promise<void> {
            if (options.shouldCache?.channel && !(await options.shouldCache.channel(channel))) return;
            if (deletedRemovals.channels.get(channel.id)) return; // The channel with the given ID was deleted

            if (!channel.guildId) channel.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.channels) {
                if (channel.guildId) bot.cache.channels.guildIDs.set(channel.id, channel.guildId);

                if (options.cacheInMemory?.guilds) {
                    const guildID = bot.cache.channels.guildIDs.get(channel.id);
                    if (guildID) {
                        const guild = bot.cache.guilds.memory.get(guildID);
                        if (guild) guild.channels.set(channel.id, channel);
                        else {
                            const pendingGuild = pendingGuildsData.get(guildID);
                            if (!pendingGuild) pendingGuildsData.set(guildID, { channels: new Collection() });

                            pendingGuildsData.get(guildID)?.channels?.set(channel.id, channel);
                        }
                    } else console.warn(`[CACHE] Can't cache channel(${channel.id}) since guild.channels is enabled but a guild id was not found.`);
                } else bot.cache.channels.memory.set(channel.id, channel);
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.channels) if (options.setItem) await options.setItem('channels', channel);
        },
        delete: async function (id: BigString): Promise<void> {
            // Force id to bigint
            const channelID = BigInt(id);
            // Remove from memory
            bot.cache.channels.memory.delete(channelID);
            bot.cache.guilds.memory.get(bot.cache.channels.guildIDs.get(channelID)!)?.channels?.delete(channelID);
            bot.cache.channels.guildIDs.delete(channelID);
            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('channels', channelID);
        },
    };

    // MODIFY TRANSFORMERS
    const { guild } = bot.transformers;

    // MAKE SURE TO NOT MOVE THIS BELOW GUILD TRANSFORMER
    bot.transformers.customizers.member = function (_, _payload, member) {
        // Create the object from existing transformer.
        const old = member;

        // Filter to desired args
        const args: T['member'] = {};
        const keys = Object.keys(old) as (keyof Member)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.members?.includes(key)) args[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.members?.includes(key)) continue;
            // If member did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.members?.length) args[key] = old[key];
        }

        // Add to memory
        bot.cache.members.set(args);

        return args;
    };

    bot.transformers.customizers.user = function (_, _payload, user) {
        // Create the object from existing transformer.
        const old = user;

        // Filter to desired args
        const args: T['user'] = {};
        const keys = Object.keys(old) as (keyof User)[];

        for (const key of keys) {
            // ID prop is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.users?.includes(key)) args[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.users?.includes(key)) continue;
            // If user did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.users?.length) args[key] = old[key];
        }

        // Add to memory
        bot.cache.users.set(args);

        return args;
    };

    bot.transformers.guild = function (_, payload) {
        if (options.cacheInMemory?.guilds) {
            // Get the guild id in bigint
            const guildId = bot.transformers.snowflake(payload.guild.id);
            if (!bot.cache.guilds.memory.get(guildId)) {
                // Make a raw guild object we can put in memory before running the old transformer which runs all the other transformers
                const preCacheGuild = {
                    toggles: new GuildToggles(payload.guild),
                    name: payload.guild.name,
                    memberCount: payload.guild.member_count ?? payload.guild.approximate_member_count ?? 0,
                    shardId: payload.shardId,
                    icon: payload.guild.icon ? iconHashToBigInt(payload.guild.icon) : undefined,
                    channels: new Collection<bigint, T['channel']>(),
                    roles: new Collection<bigint, T['role']>(),
                    id: guildId,
                    // WEIRD EDGE CASE WITH BOT CREATED SERVERS
                    ownerId: payload.guild.owner_id ? bot.transformers.snowflake(payload.guild.owner_id) : 0n,
                };

                // CACHE DIRECT TO MEMORY BECAUSE OTHER TRANSFORMERS NEED THE GUILD IN CACHE
                bot.cache.guilds.memory.set(preCacheGuild.id, preCacheGuild);
            }
        }

        // Create the object from existing transformer.
        const old = guild(bot, payload);

        options.shouldCache?.guild?.(old).then((shouldCache) => {
            if (!shouldCache) bot.cache.guilds.memory.delete(old.id);
        });

        // Filter to desired args
        const args: T['guild'] = {
            members: new Collection(),
        };

        const keys = Object.keys(old) as (keyof Guild)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.guilds?.includes(key)) args[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.guilds?.includes(key)) continue;
            // If guild did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.guilds?.length) args[key] = old[key];
        }

        const pendingGuildData = pendingGuildsData.get(old.id);

        if (pendingGuildData) {
            if (pendingGuildData.channels?.size) old.channels = new Collection([...old.channels, ...pendingGuildData.channels]);
            if (pendingGuildData.members?.size) args.members = new Collection([...args.members, ...pendingGuildData.members]);
            if (pendingGuildData.roles?.size) old.roles = new Collection([...old.roles, ...pendingGuildData.roles]);
        }

        // Fix bug where data be gone (didn't fix this for cacheOutsideMemory)
        if (options.cacheInMemory?.guilds) {
            const oldGuild = bot.cache.guilds.memory.get(old.id);
            if (oldGuild) {
                if (!payload.guild.channels) args.channels = oldGuild.channels;
                if (!payload.guild.members) args.members = oldGuild.members;
                if (!payload.guild.roles) args.roles = oldGuild.roles;
            }
        }

        // Set approximate member count as member count if payload is from API
        if (payload.guild.approximate_member_count && options.desiredProps?.guilds?.includes('memberCount')) args.memberCount = payload.guild.approximate_member_count;

        // Add to memory
        bot.cache.guilds.set(args);

        if (payload.guild.members) {
            for (const member of payload.guild.members) {
                if (member.user) {
                    bot.transformers.member(bot, member, old.id, BigInt(member.user.id));
                    bot.transformers.user(bot, member.user);
                }
            }
        }

        return args;
    };

    bot.transformers.customizers.channel = function (_, _payload, channel) {
        // Create the object from existing transformer.
        const old = channel;

        // Filter to desired args
        const args: T['channel'] = {};
        const keys = Object.keys(old) as (keyof Channel)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.channels?.includes(key)) args[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.channels?.includes(key)) continue;
            // If channel did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.channels?.length) args[key] = old[key];
        }

        // Add to memory
        bot.cache.channels.set(args);

        return args;
    };

    bot.transformers.customizers.role = function (_, _payload, role) {
        // Create the object from existing transformer.
        const old = role;

        // Filter to desired args
        const args: T['role'] = {};
        const keys = Object.keys(old) as (keyof Role)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.roles?.includes(key)) args[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.roles?.includes(key)) continue;
            // If role did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.roles?.length) args[key] = old[key];
        }

        // Add to memory
        bot.cache.roles.set(args);

        return args;
    };

    // For cache removals
    const deletedRemovals: DeletedRemovalsProps = {
        channels: new Collection<bigint, { expiresIn: number }>(),
    };
    setInterval(() => {
        for (const channel of deletedRemovals.channels.filter(c => c.expiresIn < Date.now()).keys()) {
            deletedRemovals.channels.delete(channel)
        }
    }, 5000);

    setupCacheRemovals(bot, deletedRemovals);
    setupCacheEdits(bot);

    if (options.maxCacheInactiveTime !== -1) {
        setInterval(() => {
            bot.cache.channels.memory.forEach((channel) => {
                if (Date.now() - channel.lastInteractedTime > options.maxCacheInactiveTime!) bot.cache.guilds.delete(channel.id);
            });

            bot.cache.guilds.memory.forEach((guild) => {
                if (Date.now() - guild.lastInteractedTime > options.maxCacheInactiveTime!) bot.cache.guilds.delete(guild.id);
            });

            bot.cache.users.memory.forEach((user) => {
                if (user.id !== bot.id && Date.now() - user.lastInteractedTime > options.maxCacheInactiveTime!) bot.cache.guilds.delete(user.id);
            });
        }, options.cacheSweepInterval);
    }

    return bot;
}

export type ProxyCacheTypes<T extends boolean = true> = {
    guild: T extends true ? Guild : any;
    user: T extends true ? User : any;
    channel: T extends true ? Channel : any;
    member: T extends true ? Member : any;
    role: T extends true ? Role : any;
};

export interface CreateProxyCacheOptions {
    /** Configure the handlers that should be ran whenever something is about to be cached to determine whether it should or should not be cached. */
    shouldCache?: {
        /** Handler to check whether or not to cache this guild. */
        guild?: (guild: Guild) => Promise<boolean>;
        /** Handler to check whether or not to cache this user. */
        user?: (user: User) => Promise<boolean>;
        /** Handler to check whether or not to cache this channel. */
        channel?: (channel: Channel) => Promise<boolean>;
        /** Handler to check whether or not to cache this member. */
        member?: (member: Member) => Promise<boolean>;
        /** Handler to check whether or not to cache this role. */
        role?: (role: Role) => Promise<boolean>;
    };
    /** Configure the exact properties you wish to have in each object. */
    desiredProps?: {
        /** The properties you want to keep in a user object. */
        users?: (keyof User)[];
        /** The properties you want to keep in a guild object. */
        guilds?: (keyof Guild)[];
        /** The properties you want to keep in a channel object. */
        channels?: (keyof Channel)[];
        /** The properties you want to keep in a member object. */
        members?: (keyof Member)[];
        /** The properties you want to keep in a role object. */
        roles?: (keyof Role)[];
    };
    /** Configure the properties you do NOT want in each object. */
    undesiredProps?: {
        /** The properties you do NOT want in a user object. */
        users?: (keyof User)[];
        /** The properties you do NOT want in a guild object. */
        guilds?: (keyof Guild)[];
        /** The properties you do NOT want in a channel object. */
        channels?: (keyof Channel)[];
        /** The properties you do NOT want in a member object. */
        members?: (keyof Member)[];
        /** The properties you do NOT want in a role object. */
        roles?: (keyof Role)[];
    };
    /** Options to choose how the proxy will cache everything.
     *
     * By default, all props inside `cacheInMemory` are set to `true`. */
    cacheInMemory?: {
        /** Whether or not to cache guilds. */
        guilds?: boolean;
        /** Whether or not to cache users. */
        users?: boolean;
        /** Whether or not to cache channels. If guilds is enabled, then these are cached inside the guild object. */
        channels?: boolean;
        /** Whether or not to cache members. If guilds is enabled, then these are cached inside the guild object. */
        members?: boolean;
        /** Whether or not the cache roles. If guilds is enabled, then these are cached inside the guild object.*/
        roles?: boolean;
        /** Default value for the properties that are not provided inside `cacheInMemory`. */
        default: boolean;
    };
    /** Options to choose how the proxy will cache in a separate persitant cache.
     *
     * By default, all props inside `cacheOutsideMemory` are set to `false`. */
    cacheOutsideMemory?: {
        /** Whether or not to cache guilds. */
        guilds?: boolean;
        /** Whether or not to cache users. */
        users?: boolean;
        /** Whether or not to cache channels. */
        channels?: boolean;
        /** Whether or not to cache members. */
        members?: boolean;
        /** Whether or not to cache roles. */
        roles?: boolean;
        /** Default value for the properties that are not provided inside `cacheOutsideMemory`. */
        default: boolean;
    };
    /** Handler to get an object from a specific table. */
    getItem?: <T>(...args: [table: 'guilds' | 'channels' | 'roles' | 'users', id: bigint] | [table: 'members', id: bigint, guildId: bigint]) => Promise<T>;
    /** Handler to set an object in a specific table. */
    setItem?: (table: 'guilds' | 'channels' | 'roles' | 'members' | 'users', item: any) => Promise<unknown>;
    /** Handler to delete an object in a specific table. */
    removeItem?: (...args: [table: 'guilds' | 'channels' | 'roles' | 'users', id: bigint] | [table: 'members', id: bigint, guildId: bigint]) => Promise<unknown>;
    bulk?: {
        /** Handler used to remove multiple objects in bulk. Instead of making hundreds of queries, you can optimize here using your preferred form. For example, when a guild is deleted, you want to make sure all channels, roles, and members are removed as well. */
        removeGuild?: (id: bigint) => Promise<unknown>;
        /** Handler used to remove multiple objects in bulk. Instead of making hundreds of queries, you can optimize here using your preferred form. For example, when a role is deleted, you want to make sure all members who have this role are edited as well. */
        removeRole?: (id: bigint) => Promise<unknown>;
        /** Options to choose whether or not to replace internal removers. */
        replaceInternalBulkRemover?: {
            /** Whether or not to replace internal guild remover.
             *
             * By default, the proxy will bulk remove guilds from memory. You can override this behavior by setting this option to `true`.
             */
            guild?: boolean;
            /** Whether or not to replace internal channel remover.
             *
             * By default, the proxy will bulk remove channel from memory. You can override this behavior by setting this option to `true`.
             */
            channel?: boolean;
            /** Whether or not to replace internal role remover.
             *
             * By default, the proxy will bulk remove role from memory. You can override this behavior by setting this option to `true`.
             */
            role?: boolean;
        };
    };
    /** The amount of time in ms to keep an object in the cache when it's inactive, works for: channels (excluding guild channels), guilds, users cache. Defaults to infinity. */
    maxCacheInactiveTime?: number;
    /** The amount of time in ms to run cache sweeper that removes the objects from the cache that is in the cache for longer than `options.maxCacheAliveTime`. Defaults to 5 minutes. */
    cacheSweepInterval?: number;
}
