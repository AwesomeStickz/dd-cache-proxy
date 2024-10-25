import { Bot, Channel, Collection, Guild, GuildToggles, Member, Role, User } from '@discordeno/bot';
import { iconHashToBigInt } from '@discordeno/utils';
import { setupCacheEdits } from './setupCacheEdits.js';
import { setupCacheRemovals } from './setupCacheRemovals.js';
import { setupDummyEvents } from './setupDummyEvents.js';

type ApplyLastInteractedTimeToAll<T> = {
    [P in keyof T]: LastInteractedTimeTrackedRecord<T[P]>;
};

export interface ProxyCacheProps<T extends ProxyCacheTypes, U extends ApplyLastInteractedTimeToAll<T> = ApplyLastInteractedTimeToAll<T>> {
    cache: {
        options: CreateProxyCacheOptions<T>;
        channels: {
            guildIds: Collection<bigint, bigint>;
            memory: Collection<bigint, U['channel']>;
            get: (id: bigint) => Promise<U['channel'] | undefined>;
            set: (value: U['channel']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        guilds: {
            memory: Collection<bigint, U['guild']>;
            get: (id: bigint) => Promise<U['guild'] | undefined>;
            set: (value: U['guild']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        members: {
            get: (id: bigint, guildId: bigint) => Promise<U['member'] | undefined>;
            set: (value: U['member']) => Promise<void>;
            delete: (id: bigint, guildId: bigint) => Promise<void>;
        };
        roles: {
            guildIds: Collection<bigint, bigint>;
            get: (id: bigint) => Promise<U['role'] | undefined>;
            set: (value: U['role']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        users: {
            memory: Collection<bigint, U['user']>;
            get: (id: bigint) => Promise<U['user'] | undefined>;
            set: (value: U['user']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
    };
}

export type BotWithProxyCache<T extends ProxyCacheTypes, B extends Bot = Bot> = B & ProxyCacheProps<T>;

export const createProxyCache = <T extends ProxyCacheTypes = ProxyCacheTypes, B extends Bot = Bot>(rawBot: B, options: CreateProxyCacheOptions<T>): BotWithProxyCache<T, B> => {
    const bot = rawBot as BotWithProxyCache<T, B>;

    // @ts-ignore
    bot.cache = { options };

    const pendingGuildsData = new Collection<
        bigint,
        {
            channels?: Collection<bigint, LastInteractedTimeTrackedRecord<T['channel']>>;
            members?: Collection<bigint, LastInteractedTimeTrackedRecord<T['member']>>;
            roles?: Collection<bigint, LastInteractedTimeTrackedRecord<T['role']>>;
        }
    >();

    if (!bot.cache.options.cacheInMemory) bot.cache.options.cacheInMemory = { default: true };
    if (!bot.cache.options.cacheOutsideMemory) bot.cache.options.cacheOutsideMemory = { default: false };

    const cacheInMemoryDefault = bot.cache.options.cacheInMemory.default;
    const cacheOutsideMemoryDefault = bot.cache.options.cacheOutsideMemory.default;

    bot.cache.options.cacheInMemory = {
        channels: cacheInMemoryDefault,
        guilds: cacheInMemoryDefault,
        members: cacheInMemoryDefault,
        roles: cacheInMemoryDefault,
        users: cacheInMemoryDefault,
        ...bot.cache.options.cacheInMemory,
    };

    bot.cache.options.cacheOutsideMemory = {
        channels: cacheOutsideMemoryDefault,
        guilds: cacheOutsideMemoryDefault,
        members: cacheOutsideMemoryDefault,
        roles: cacheOutsideMemoryDefault,
        users: cacheOutsideMemoryDefault,
        ...bot.cache.options.cacheOutsideMemory,
    };

    const internalBulkRemover = {
        removeGuild: async (id: bigint) => {
            // Remove from memory
            bot.cache.guilds.memory.delete(id);

            // Remove any associated channels
            bot.cache.channels.memory.forEach((channel) => {
                if (channel.guildId === id) {
                    bot.cache.channels.memory.delete(channel.id);
                    bot.cache.channels.guildIds.delete(channel.id);
                }
            });
        },
        removeRole: async (id: bigint) => {
            const guildId = bot.cache.roles.guildIds.get(id);
            if (guildId) {
                // Get the guild if its in cache
                const guild = bot.cache.guilds.memory.get(guildId);
                if (guild) {
                    // if roles are stored inside the guild remove it
                    guild.roles?.delete(id);
                    // Each mem who has this role needs to be edited and the role id removed
                    guild.members?.forEach((member) => {
                        if (member.roles?.includes(id)) member.roles = member.roles.filter((roleId) => roleId !== id);
                    });
                }
            }

            bot.cache.roles.guildIds.delete(id);
        },
    };

    if (!bot.cache.options.bulk) bot.cache.options.bulk = {};

    // Get bulk removers passed by user, data about which internal removers to replace
    const { removeGuild, removeRole } = bot.cache.options.bulk;
    const { replaceInternalBulkRemover } = bot.cache.options.bulk;

    // If user passed bulk.removeGuild else if replaceInternalBulkRemover.guild is not set to true
    if (removeGuild || !replaceInternalBulkRemover?.guild) {
        bot.cache.options.bulk.removeGuild = async (id) => {
            // If replaceInternalBulkRemover.guild is not set to true, run internal guild bulk remover
            if (!replaceInternalBulkRemover?.guild) await internalBulkRemover.removeGuild(id);
            // If user passed bulk.removeGuild, run passed bulk remover
            await removeGuild?.(id);
        };
    }

    // If user passed bulk.removeRole else if replaceInternalBulkRemover.role is not set to true
    if (removeRole || !replaceInternalBulkRemover?.role) {
        bot.cache.options.bulk.removeRole = async (id) => {
            // If replaceInternalBulkRemover.role is not set to true, run internal role bulk remover
            if (!replaceInternalBulkRemover?.role) await internalBulkRemover.removeRole(id);
            // If user passed bulk.removeRole, run passed bulk remover
            await removeRole?.(id);
        };
    }

    bot.cache.guilds = {
        memory: new Collection(),
        get: async (guildId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.guilds) {
                const guild = bot.cache.guilds.memory.get(guildId);
                if (guild) {
                    guild.lastInteractedTime = Date.now();

                    return guild;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.guilds || !options.getItem) return;

            const stored = await options.getItem('guild', guildId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.guilds) bot.cache.guilds.memory.set(guildId, stored);
            }

            return stored;
        },
        set: async (guild) => {
            // Should this be cached or not?
            if (options.shouldCache?.guild && !(await options.shouldCache.guild(guild))) return;

            guild.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.guilds) bot.cache.guilds.memory.set(guild.id, guild);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.guilds && options.setItem) await options.setItem('guild', guild);
        },
        delete: async (guildId) => {
            // Remove from memory
            bot.cache.guilds.memory.delete(guildId);

            // Remove from non-memory cache
            await options.bulk?.removeGuild?.(guildId);
        },
    };

    bot.cache.users = {
        memory: new Collection(),
        get: async (userId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.users) {
                const user = bot.cache.users.memory.get(userId);
                if (user) {
                    user.lastInteractedTime = Date.now();

                    return user;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.users || !options.getItem) return;

            const stored = await options.getItem('user', userId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.users) bot.cache.users.memory.set(userId, stored);
            }

            return stored;
        },
        set: async (user) => {
            if (options.shouldCache?.user && !(await options.shouldCache.user(user))) return;

            user.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.users) bot.cache.users.memory.set(user.id, user);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.users && options.setItem) await options.setItem('user', user);
        },
        delete: async (userId) => {
            // Remove from memory
            bot.cache.users.memory.delete(userId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('user', userId);
        },
    };

    bot.cache.roles = {
        guildIds: new Collection(),
        get: async (roleId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.roles) {
                // If guilds are cached, roles will be inside them
                if (options.cacheInMemory?.guilds) {
                    const guildId = bot.cache.roles.guildIds.get(roleId);
                    if (guildId) {
                        const role = bot.cache.guilds.memory.get(guildId)?.roles?.get(roleId);
                        if (role) {
                            role.lastInteractedTime = Date.now();

                            return role;
                        }
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.roles || !options.getItem) return;

            const stored = await options.getItem('role', roleId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.roles) bot.cache.roles.set(stored);
            }

            return stored;
        },
        set: async (role) => {
            if (options.shouldCache?.role && !(await options.shouldCache.role(role))) return;

            role.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.roles) {
                if (role.guildId) bot.cache.roles.guildIds.set(role.id, role.guildId);

                if (options.cacheInMemory?.guilds) {
                    const guildId = bot.cache.roles.guildIds.get(role.id);
                    if (guildId) {
                        const guild = bot.cache.guilds.memory.get(guildId);
                        if (guild) guild.roles.set(role.id, role);
                        else {
                            const pendingGuild = pendingGuildsData.get(guildId);
                            if (!pendingGuild) pendingGuildsData.set(guildId, { roles: new Collection() });

                            pendingGuildsData.get(guildId)?.roles?.set(role.id, role);
                        }
                    } else console.warn(`[CACHE] Can't cache role(${role.id}) since guild.roles is enabled but a guild id was not found.`);
                }
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.roles && options.setItem) await options.setItem('role', role);
        },
        delete: async (roleId) => {
            // Remove from memory
            bot.cache.guilds.memory.get(bot.cache.roles.guildIds.get(roleId)!)?.roles?.delete(roleId);
            bot.cache.roles.guildIds.delete(roleId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('role', roleId);
        },
    };

    bot.cache.members = {
        get: async (memberId, guildId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.members) {
                // If guilds are cached, members will be inside them
                if (options.cacheInMemory?.guilds) {
                    const member = bot.cache.guilds.memory.get(guildId)?.members?.get(memberId);
                    if (member) {
                        member.lastInteractedTime = Date.now();

                        return member;
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.members || !options.getItem) return;

            const stored = await options.getItem('member', memberId, guildId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.members) bot.cache.members.set(stored);
            }

            return stored;
        },
        set: async (member) => {
            if (options.shouldCache?.member && !(await options.shouldCache.member(member))) return;

            member.lastInteractedTime = Date.now();

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
            if (options.cacheOutsideMemory?.members && options.setItem) await options.setItem('member', member);
        },
        delete: async (memberId, guildId) => {
            // Remove from memory
            bot.cache.guilds.memory.get(guildId)?.members?.delete(memberId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('member', memberId, guildId);
        },
    };

    bot.cache.channels = {
        guildIds: new Collection(),
        memory: new Collection(),
        get: async (channelId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.channels) {
                // If guilds are cached, channels will be inside them
                if (options.cacheInMemory?.guilds) {
                    const guildId = bot.cache.channels.guildIds.get(channelId);
                    if (guildId) {
                        const channel = bot.cache.guilds.memory.get(guildId)?.channels?.get(channelId);
                        if (channel) {
                            channel.lastInteractedTime = Date.now();

                            return channel;
                        }
                    } else {
                        // Return from cache.channels if this channel isn't in a guild
                        const channel = bot.cache.channels.memory.get(channelId);
                        if (channel) {
                            channel.lastInteractedTime = Date.now();

                            return channel;
                        }
                    }
                } else {
                    const channel = bot.cache.channels.memory.get(channelId);
                    if (channel) {
                        channel.lastInteractedTime = Date.now();

                        return channel;
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.channels || !options.getItem) return;

            const stored = await options.getItem('channel', channelId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.channels) bot.cache.channels.memory.set(channelId, stored);
            }

            return stored;
        },
        set: async (channel) => {
            if (options.shouldCache?.channel && !(await options.shouldCache.channel(channel))) return;

            channel.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.channels) {
                if (channel.guildId) bot.cache.channels.guildIds.set(channel.id, channel.guildId);

                if (options.cacheInMemory?.guilds) {
                    const guildId = bot.cache.channels.guildIds.get(channel.id);
                    if (guildId) {
                        const guild = bot.cache.guilds.memory.get(guildId);
                        if (guild) guild.channels.set(channel.id, channel);
                        else {
                            const pendingGuild = pendingGuildsData.get(guildId);
                            if (!pendingGuild) pendingGuildsData.set(guildId, { channels: new Collection() });

                            pendingGuildsData.get(guildId)?.channels?.set(channel.id, channel);
                        }
                    } else console.warn(`[CACHE] Can't cache channel(${channel.id}) since guild.channels is enabled but a guild id was not found.`);
                } else bot.cache.channels.memory.set(channel.id, channel);
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.channels && options.setItem) await options.setItem('channel', channel);
        },
        delete: async (channelId) => {
            // Remove from memory
            bot.cache.channels.memory.delete(channelId);
            bot.cache.guilds.memory.get(bot.cache.channels.guildIds.get(channelId)!)?.channels?.delete(channelId);
            bot.cache.channels.guildIds.delete(channelId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('channel', channelId);
        },
    };

    // MAKE SURE TO NOT MOVE THIS BELOW GUILD TRANSFORMER
    bot.transformers.customizers.member = (_, _payload, member) => {
        // Create the object from existing transformer.
        const old = member;

        // Filter to desired args
        const args: LastInteractedTimeTrackedRecord<T['member']> = {
            id: old.id,
            guildId: old.guildId,
            lastInteractedTime: Date.now(),
        };

        const keys = Object.keys(old) as (keyof Member)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.members?.includes(key)) args[key] = old[key] as never;
            // If undesired we skip
            else if (options.undesiredProps?.members?.includes(key)) continue;
            // If member did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.members?.length) args[key] = old[key] as never;
        }

        // Add to memory
        bot.cache.members.set(args);

        return args;
    };

    bot.transformers.customizers.user = (_, _payload, user) => {
        // Create the object from existing transformer.
        const old = user;

        // Filter to desired args
        const args: LastInteractedTimeTrackedRecord<T['user']> = {
            id: old.id,
            lastInteractedTime: Date.now(),
        };

        const keys = Object.keys(old) as (keyof User)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.users?.includes(key)) args[key] = old[key] as never;
            // If undesired we skip
            else if (options.undesiredProps?.users?.includes(key)) continue;
            // If user did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.users?.length) args[key] = old[key] as never;
        }

        // Add to memory
        bot.cache.users.set(args);

        return args;
    };

    bot.transformers.customizers.guild = (_, payload, guild) => {
        if (options.cacheInMemory?.guilds) {
            // Get the guild id in bigint
            const guildId = bot.transformers.snowflake(payload.id);
            // Make a raw guild object we can put in memory before running the old transformer which runs all the other transformers
            const preCacheGuild: LastInteractedTimeTrackedRecord<T['guild']> = {
                toggles: new GuildToggles(payload),
                name: payload.name,
                memberCount: payload.member_count ?? payload.approximate_member_count ?? 0,
                shardId: guild.shardId,
                icon: payload.icon ? iconHashToBigInt(payload.icon) : undefined,
                channels: new Collection(),
                members: new Collection(),
                roles: new Collection(),
                id: guildId,
                // WEIRD EDGE CASE WITH BOT CREATED SERVERS
                ownerId: payload.owner_id ? bot.transformers.snowflake(payload.owner_id) : 0n,
                lastInteractedTime: Date.now(),
            };

            // CACHE DIRECT TO MEMORY BECAUSE OTHER TRANSFORMERS NEED THE GUILD IN CACHE
            bot.cache.guilds.memory.set(preCacheGuild.id, preCacheGuild);
        }

        // Create the object from existing transformer.
        const old: T['guild'] = {
            ...guild,
            channels: new Collection(guild.channels.array().map((channel) => [channel.id, { ...channel, lastInteractedTime: Date.now() } as LastInteractedTimeTrackedRecord<T['channel']>])),
            members: new Collection(guild.members.array().map((member) => [member.id, { ...member, lastInteractedTime: Date.now() } as LastInteractedTimeTrackedRecord<T['member']>])),
            roles: new Collection(guild.roles.array().map((role) => [role.id, { ...role, lastInteractedTime: Date.now() } as LastInteractedTimeTrackedRecord<T['role']>])),
        };

        options.shouldCache?.guild?.(old).then((shouldCache) => {
            if (!shouldCache) bot.cache.guilds.memory.delete(old.id);
        });

        // Filter to desired args
        const args: LastInteractedTimeTrackedRecord<T['guild']> = {
            id: old.id,
            channels: new Collection(),
            members: new Collection(),
            roles: new Collection(),
            lastInteractedTime: Date.now(),
        };

        const keys = Object.keys(old) as (keyof Guild)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.guilds?.includes(key)) args[key] = old[key] as never;
            // If undesired we skip
            else if (options.undesiredProps?.guilds?.includes(key)) continue;
            // If guild did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.guilds?.length) args[key] = old[key] as never;
        }

        const pendingGuildData = pendingGuildsData.get(old.id);

        if (pendingGuildData) {
            if (pendingGuildData.channels?.size) args.channels = new Collection([...old.channels, ...pendingGuildData.channels]);
            if (pendingGuildData.members?.size) args.members = new Collection([...old.members, ...pendingGuildData.members]);
            if (pendingGuildData.roles?.size) args.roles = new Collection([...old.roles, ...pendingGuildData.roles]);
        }

        // Set approximate member count as member count if payload is from API
        if (payload.approximate_member_count && options.desiredProps?.guilds?.includes('memberCount')) args.memberCount = payload.approximate_member_count;

        // Add to memory
        bot.cache.guilds.set(args);

        if (payload.members) {
            for (const member of payload.members) {
                if (member.user) {
                    bot.transformers.member(bot, member, old.id, BigInt(member.user.id));
                    bot.transformers.user(bot, member.user);
                }
            }
        }

        return args;
    };

    bot.transformers.customizers.channel = (_, _payload, channel) => {
        // Create the object from existing transformer.
        const old = channel;

        // Filter to desired args
        const args: LastInteractedTimeTrackedRecord<T['channel']> = {
            id: old.id,
            guildId: old.guildId,
            lastInteractedTime: Date.now(),
        };

        const keys = Object.keys(old) as (keyof Channel)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.channels?.includes(key)) args[key] = old[key] as never;
            // If undesired we skip
            else if (options.undesiredProps?.channels?.includes(key)) continue;
            // If channel did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.channels?.length) args[key] = old[key] as never;
        }

        // Add to memory
        bot.cache.channels.set(args);

        return args;
    };

    bot.transformers.customizers.role = (_, _payload, role) => {
        // Create the object from existing transformer.
        const old = role;

        // Filter to desired args
        const args: LastInteractedTimeTrackedRecord<T['role']> = {
            id: old.id,
            guildId: old.guildId,
            lastInteractedTime: Date.now(),
        };

        const keys = Object.keys(old) as (keyof Role)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.roles?.includes(key)) args[key] = old[key] as never;
            // If undesired we skip
            else if (options.undesiredProps?.roles?.includes(key)) continue;
            // If role did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.roles?.length) args[key] = old[key] as never;
        }

        // Add to memory
        bot.cache.roles.set(args);

        return args;
    };

    setupCacheEdits(bot);
    setupCacheRemovals(bot);

    // Set dummy functions to events that aren't used, so customizers will still be run so we can cache data
    setupDummyEvents(bot);

    // Handle cache sweeping
    if (options.sweeper) {
        const { filter, interval } = options.sweeper;

        setInterval(() => {
            if (filter.channel)
                bot.cache.channels.memory.forEach((channel) => {
                    if (filter.channel?.(channel)) bot.cache.channels.memory.delete(channel.id);
                });

            if (filter.guild || filter.channel || filter.member || filter.role)
                bot.cache.guilds.memory.forEach((guild): boolean | void => {
                    if (filter.guild?.(guild)) return bot.cache.guilds.memory.delete(guild.id);

                    if (guild.channels && filter.channel)
                        guild.channels.forEach((channel) => {
                            if (filter.channel?.(channel)) guild.channels?.delete(channel.id);
                        });

                    if (guild.members && filter.member)
                        guild.members.forEach((member) => {
                            if (filter.member?.(member)) guild.members?.delete(member.id);
                        });

                    if (guild.roles && filter.role)
                        guild.roles.forEach((role) => {
                            if (filter.role?.(role)) guild.roles?.delete(role.id);
                        });
                });

            if (filter.user)
                bot.cache.users.memory.forEach((user) => {
                    if (filter.user?.(user)) bot.cache.users.memory.delete(user.id);
                });
        }, interval);
    }

    return bot;
};

type PartialExceptId<T> = Partial<T> & { id: bigint };
type PartialExceptIdAndGuildId<T> = PartialExceptId<T> & { guildId: bigint };

export type ProxyCacheTypes = {
    channel: PartialExceptId<Channel>;
    guild: Omit<PartialExceptId<Guild>, 'channels' | 'members' | 'roles'> & {
        channels: Collection<bigint, LastInteractedTimeTrackedRecord<PartialExceptId<Channel>>>;
        members: Collection<bigint, LastInteractedTimeTrackedRecord<PartialExceptIdAndGuildId<Member>>>;
        roles: Collection<bigint, LastInteractedTimeTrackedRecord<PartialExceptIdAndGuildId<Role>>>;
    };
    member: PartialExceptIdAndGuildId<Member>;
    role: PartialExceptIdAndGuildId<Role>;
    user: PartialExceptId<User>;
};

// Note: Adding ProxyCacheTypes[K] because TS doesn't provide autocomplete on extends keyof generic, this trick will provide autocomplete
type DesiredPropsArray<T extends ProxyCacheTypes, K extends keyof ProxyCacheTypes> = Array<keyof T[K] | keyof ProxyCacheTypes[K]>;

export interface CreateProxyCacheOptions<T extends ProxyCacheTypes, U extends ApplyLastInteractedTimeToAll<T> = ApplyLastInteractedTimeToAll<T>> {
    /** Configure the exact properties you wish to have in each object. */
    desiredProps?: {
        /** The properties you want to keep in a channel object. */
        channels?: DesiredPropsArray<T, 'channel'>;
        /** The properties you want to keep in a guild object. */
        guilds?: DesiredPropsArray<T, 'guild'>;
        /** The properties you want to keep in a member object. */
        members?: DesiredPropsArray<T, 'member'>;
        /** The properties you want to keep in a role object. */
        roles?: DesiredPropsArray<T, 'role'>;
        /** The properties you want to keep in a user object. */
        users?: DesiredPropsArray<T, 'user'>;
    };
    /** Configure the properties you do NOT want in each object. */
    undesiredProps?: {
        /** The properties you do NOT want in a channel object. */
        channels?: DesiredPropsArray<T, 'channel'>;
        /** The properties you do NOT want in a guild object. */
        guilds?: DesiredPropsArray<T, 'guild'>;
        /** The properties you do NOT want in a member object. */
        members?: DesiredPropsArray<T, 'member'>;
        /** The properties you do NOT want in a role object. */
        roles?: DesiredPropsArray<T, 'role'>;
        /** The properties you do NOT want in a user object. */
        users?: DesiredPropsArray<T, 'user'>;
    };
    /**
     * Options to choose how the proxy will cache everything.
     *
     * By default, all props inside `cacheInMemory` are set to `true`.
     */
    cacheInMemory?: {
        /** Whether or not to cache channels. If guilds is enabled, then these are cached inside the guild object. */
        channels?: boolean;
        /** Whether or not to cache guilds. */
        guilds?: boolean;
        /** Whether or not to cache members. If guilds is enabled, then these are cached inside the guild object. */
        members?: boolean;
        /** Whether or not the cache roles. If guilds is enabled, then these are cached inside the guild object.*/
        roles?: boolean;
        /** Whether or not to cache users. */
        users?: boolean;
        /** Default value for the properties that are not provided inside `cacheInMemory`. */
        default: boolean;
    };
    /**
     * Options to choose how the proxy will cache in a separate persitant cache.
     *
     * By default, all props inside `cacheOutsideMemory` are set to `false`.
     */
    cacheOutsideMemory?: {
        /** Whether or not to cache channels. */
        channels?: boolean;
        /** Whether or not to cache guilds. */
        guilds?: boolean;
        /** Whether or not to cache members. */
        members?: boolean;
        /** Whether or not to cache roles. */
        roles?: boolean;
        /** Whether or not to cache users. */
        users?: boolean;
        /** Default value for the properties that are not provided inside `cacheOutsideMemory`. */
        default: boolean;
    };
    /** Handler to get an object from a specific table. */
    getItem?: <K extends keyof U>(...args: [table: Exclude<K, 'member'>, id: bigint] | [table: Extract<K, 'member'>, id: bigint, guildId: bigint]) => Promise<U[K]>;
    /** Handler to set an object in a specific table. */
    setItem?: <K extends keyof U>(table: K, item: U[K]) => Promise<U[K]>;
    /** Handler to delete an object in a specific table. */
    removeItem?: <K extends keyof U>(...args: [table: Exclude<K, 'member'>, id: bigint] | [table: Extract<K, 'member'>, id: bigint, guildId: bigint]) => Promise<unknown>;
    /**
     * Options for handling the removal of objects that may trigger bulk modifications or deletions of associated entities.
     *
     * This allows for performance optimization by consolidating multiple operations into a single action, rather than executing hundreds of queries.
     */
    bulk?: {
        /** Handler for the removal of guilds and their associated entities (e.g., channels, members and roles). */
        removeGuild?: (id: bigint) => Promise<unknown>;
        /** Handler for the removal of roles and their associated entities (e.g., members having this role). */
        removeRole?: (id: bigint) => Promise<unknown>;
        /**
         * Options to choose whether or not to replace internal removers.
         *
         * By default, the proxy will handle the bulk modifications and deletions of associated entities from in-memory cache. You can override this behavior by setting this option to `true`.
         */
        replaceInternalBulkRemover?: {
            /** Whether or not to replace the internal guild remover. */
            guild?: boolean;
            /** Whether or not to replace the internal role remover. */
            role?: boolean;
        };
    };
    /** Configure the handlers that should be ran whenever something is about to be cached to determine whether it should or should not be cached. */
    shouldCache?: {
        /** Handler to check whether or not to cache this channel. */
        channel?: (channel: T['channel'] | Channel) => Promise<boolean>;
        /** Handler to check whether or not to cache this guild. */
        guild?: (guild: T['guild'] | Guild) => Promise<boolean>;
        /** Handler to check whether or not to cache this member. */
        member?: (member: T['member'] | Member) => Promise<boolean>;
        /** Handler to check whether or not to cache this role. */
        role?: (role: T['role'] | Role) => Promise<boolean>;
        /** Handler to check whether or not to cache this user. */
        user?: (user: T['user'] | User) => Promise<boolean>;
    };
    /** Options for cache sweeper. This works for in-memory cache only. For outside memory cache, you should implement your own sweeper. */
    sweeper?: {
        /** The interval (in milliseconds) at which the cache sweeper should run the provided filter functions. */
        interval: number;
        /**
         * Filters to decide which objects to remove from the cache. Defaults to removing nothing.
         *
         * Note: Make use of the `lastInteractedTime` property in the objects to implement an NRU (Not Recently Used) cache if you'd like.
         */
        filter: {
            /** Filter to decide whether or not to remove a channel from the cache. */
            channel?: (channel: U['channel']) => boolean;
            /** Filter to decide whether or not to remove a guild from the cache. */
            guild?: (guild: U['guild']) => boolean;
            /** Filter to decide whether or not to remove a member from the cache. */
            member?: (member: U['member']) => boolean;
            /** Filter to decide whether or not to remove a role from the cache. */
            role?: (role: U['role']) => boolean;
            /** Filter to decide whether or not to remove a user from the cache. */
            user?: (user: U['user']) => boolean;
        };
    };
}

type LastInteractedTimeTrackedRecord<T> = T & {
    /** The UNIX timestamp representing the time this object was last accessed or modified. */
    lastInteractedTime: number;
};
