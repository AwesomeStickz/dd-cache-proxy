import { baseChannel, baseGuild, baseMember, baseRole, baseUser, Bot, Channel, Collection, Guild, Member, Role, User, type DesiredPropertiesBehavior, type SetupDesiredProps, type TransformersDesiredProperties } from '@discordeno/bot';
import { setupCacheEdits } from './setupCacheEdits.js';
import { setupCacheRemovals } from './setupCacheRemovals.js';
import { setupDummyEvents } from './setupDummyEvents.js';

// Filter props from types of the objects based on the provided desired and undesired props
type FilterProps<T, Desired extends keyof T, Undesired extends keyof T> = LastInteractedTimeTrackedRecord<Omit<Pick<T, Desired>, Undesired>>;

type FilteredProxyCacheTypes<T extends ProxyCacheTypes<Props, Behavior>, Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior, O extends CreateProxyCacheOptions<T, Props, Behavior> = CreateProxyCacheOptions<T, Props, Behavior>> = {
    [P in keyof T]: P extends 'guild'
        ? LastInteractedTimeTrackedRecord<
              Omit<FilterProps<T[P], O['desiredProps'] extends Record<P, (keyof T[P])[]> ? O['desiredProps'][P][number] : keyof T[P], O['undesiredProps'] extends Record<P, (keyof T[P])[]> ? O['undesiredProps'][P][number] : never>, 'channels' | 'members' | 'roles' | 'lastInteractedTime'> & {
                  channels?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior, O>['channel']>;
                  members?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior, O>['member']>;
                  roles?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior, O>['role']>;
              }
          >
        : FilterProps<T[P], O['desiredProps'] extends Record<P, (keyof T[P])[]> ? O['desiredProps'][P][number] : keyof T[P], O['undesiredProps'] extends Record<P, (keyof T[P])[]> ? O['undesiredProps'][P][number] : never>;
};

export interface ProxyCacheProps<T extends ProxyCacheTypes<DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior>, DiscordenoDesiredProps extends TransformersDesiredProperties, DiscordenoDesiredPropsBehavior extends DesiredPropertiesBehavior, O extends CreateProxyCacheOptions<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior>> {
    cache: {
        options: CreateProxyCacheOptions<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior>;
        channels: {
            guildIds: Collection<bigint, bigint>;
            memory: Collection<bigint, FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['channel']>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['channel'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['channel'], replaceCurrentValue?: boolean) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        guilds: {
            memory: Collection<bigint, FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild']>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild'], replaceCurrentValue?: boolean) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        members: {
            get: (id: bigint, guildId: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['member'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['member'], replaceCurrentValue?: boolean) => Promise<void>;
            delete: (id: bigint, guildId: bigint) => Promise<void>;
        };
        roles: {
            guildIds: Collection<bigint, bigint>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['role'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['role'], replaceCurrentValue?: boolean) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        users: {
            memory: Collection<bigint, FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user']>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user'], replaceCurrentValue?: boolean) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        $inferredTypes: {
            channel: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['channel'];
            guild: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild'];
            member: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['member'];
            role: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['role'];
            user: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user'];
        };
    };
}

export type BotWithProxyCache<T extends ProxyCacheTypes<Props, Behavior>, Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior, B extends Bot<Props, Behavior>, O extends CreateProxyCacheOptions<T, Props, Behavior> = CreateProxyCacheOptions<T, Props, Behavior>> = B & ProxyCacheProps<T, Props, Behavior, O>;

export const createProxyCache = <Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior, B extends Bot<Props, Behavior>, T extends ProxyCacheTypes<Props, Behavior> = ProxyCacheTypes<Props, Behavior>, O extends CreateProxyCacheOptions<T, Props, Behavior> = CreateProxyCacheOptions<T, Props, Behavior>>(
    rawBot: Bot<Props, Behavior> & B,
    options: O
): BotWithProxyCache<T, Props, Behavior, B, O> => {
    const bot = rawBot as BotWithProxyCache<T, Props, Behavior, B>;

    // @ts-ignore
    bot.cache = { options };

    const pendingGuildsData = new Collection<
        bigint,
        {
            channels?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior>['channel']>;
            members?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior>['member']>;
            roles?: Collection<bigint, FilteredProxyCacheTypes<T, Props, Behavior>['role']>;
        }
    >();

    // Set default values for cacheInMemory and cacheOutsideMemory, true for in-memory and false for outside memory if not overriden by user
    const cacheInMemoryDefault = bot.cache.options.cacheInMemory?.default ?? true;
    const cacheOutsideMemoryDefault = bot.cache.options.cacheOutsideMemory?.default ?? false;

    bot.cache.options.cacheInMemory = {
        channel: cacheInMemoryDefault,
        guild: cacheInMemoryDefault,
        member: cacheInMemoryDefault,
        role: cacheInMemoryDefault,
        user: cacheInMemoryDefault,
        ...bot.cache.options.cacheInMemory,
    };

    bot.cache.options.cacheOutsideMemory = {
        channel: cacheOutsideMemoryDefault,
        guild: cacheOutsideMemoryDefault,
        member: cacheOutsideMemoryDefault,
        role: cacheOutsideMemoryDefault,
        user: cacheOutsideMemoryDefault,
        ...bot.cache.options.cacheOutsideMemory,
    };

    const internalBulkRemover = {
        removeChannel: async (id: bigint) => {
            const guildId = bot.cache.channels.guildIds.get(id);
            if (!guildId) return;

            // If guilds are cached, use the channels inside the guild, Otherwise use global channels cache
            const channelsCollection = options.cacheInMemory?.guild ? bot.cache.guilds.memory.get(guildId)?.channels : bot.cache.channels.memory;
            if (!channelsCollection) return;

            // Remove all threads that are in this channel
            for (const [threadId, thread] of channelsCollection.entries()) {
                if ((thread as unknown as Channel).parentId === id) {
                    channelsCollection.delete(threadId);

                    bot.cache.channels.guildIds.delete(threadId);
                }
            }
        },
        removeGuild: async (id: bigint) => {
            // Remove all channels that are in this guild
            for (const [channelId, channel] of bot.cache.channels.memory.entries()) {
                if ((channel as unknown as Channel).guildId === id) {
                    bot.cache.channels.memory.delete(channelId);
                    bot.cache.channels.guildIds.delete(channelId);
                }
            }
        },
        removeRole: async (id: bigint) => {
            const guildId = bot.cache.roles.guildIds.get(id);
            if (!guildId) return;

            // Get the guild if it's in cache
            const guild = bot.cache.guilds.memory.get(guildId);
            if (!guild) return;

            // Each member who has this role needs to be edited and the role id removed
            for (const member of guild.members?.values() || []) {
                const m = member as unknown as Member;

                if (m.roles?.includes(id)) m.roles = m.roles.filter((roleId) => roleId !== id);
            }
        },
    };

    if (!bot.cache.options.bulk) bot.cache.options.bulk = {};

    // Get bulk removers passed by user, data about which internal removers to replace
    const { removeChannel, removeGuild, removeRole } = bot.cache.options.bulk;
    const { replaceInternalBulkRemover } = bot.cache.options.bulk;

    // If user passed bulk.removeChannel else if replaceInternalBulkRemover.channel is not set to true
    if (removeChannel || !replaceInternalBulkRemover?.channel) {
        bot.cache.options.bulk.removeChannel = async (id) => {
            // If replaceInternalBulkRemover.channel is not set to true, run internal channel bulk remover
            if (!replaceInternalBulkRemover?.channel) await internalBulkRemover.removeChannel(id);
            // If user passed bulk.removeChannel, run passed bulk remover
            await removeChannel?.(id);
        };
    }

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
            if (options.cacheInMemory?.guild) {
                const guild = bot.cache.guilds.memory.get(guildId);
                if (guild) {
                    guild.lastInteractedTime = Date.now();

                    return guild;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.guild || !options.getItem) return;

            const stored = await options.getItem('guild', guildId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.guild) bot.cache.guilds.memory.set(guildId, stored);
            }

            return stored;
        },
        set: async (guild, replaceCurrentValue = false) => {
            // Should this be cached or not?
            if (options.shouldCache?.guild && !(await options.shouldCache.guild(guild))) return;

            // If we are not replacing the current value, we merge the new data with the old data because new one may be partial
            if (!replaceCurrentValue) {
                const oldGuild = await bot.cache.guilds.get((guild as unknown as Guild).id);

                // If we have the old guild, we merge the new data with the old data
                if (oldGuild) {
                    const keys = Object.keys(guild) as (keyof typeof guild)[];

                    for (const key of keys) {
                        (oldGuild as any)[key] = guild[key];
                    }

                    guild = oldGuild;
                }
            }

            const pendingGuildData = pendingGuildsData.get((guild as unknown as Guild).id);

            if (pendingGuildData) {
                pendingGuildsData.delete((guild as unknown as Guild).id);

                if (pendingGuildData.channels?.size) guild.channels = new Collection([...(guild.channels || []), ...pendingGuildData.channels]);
                if (pendingGuildData.members?.size) guild.members = new Collection([...(guild.members || []), ...pendingGuildData.members]);
                if (pendingGuildData.roles?.size) guild.roles = new Collection([...(guild.roles || []), ...pendingGuildData.roles]);
            }

            // Update last interacted time all channels, members and roles that don't have it set
            // NOTE: Do not recreate the objects to preserve the getters
            if (guild.channels)
                guild.channels = new Collection(
                    guild.channels.array().map((channel) => {
                        if (!channel.lastInteractedTime) channel.lastInteractedTime = Date.now();

                        return [(channel as unknown as Channel).id, channel];
                    })
                );

            if (guild.members)
                guild.members = new Collection(
                    guild.members.array().map((member) => {
                        if (!member.lastInteractedTime) member.lastInteractedTime = Date.now();

                        return [(member as unknown as Member).id, member];
                    })
                );

            if (guild.roles)
                guild.roles = new Collection(
                    guild.roles.array().map((role) => {
                        if (!role.lastInteractedTime) role.lastInteractedTime = Date.now();

                        return [(role as unknown as Role).id, role];
                    })
                );

            guild.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.guild) bot.cache.guilds.memory.set((guild as unknown as Guild).id, guild);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.guild && options.setItem) await options.setItem('guild', guild);
        },
        delete: async (guildId) => {
            // Handle bulk removal of channels
            await options.bulk?.removeGuild?.(guildId);

            // Remove from memory
            bot.cache.guilds.memory.delete(guildId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('guild', guildId);
        },
    };

    bot.cache.users = {
        memory: new Collection(),
        get: async (userId) => {
            // If available in memory, use it.
            if (options.cacheInMemory?.user) {
                const user = bot.cache.users.memory.get(userId);
                if (user) {
                    user.lastInteractedTime = Date.now();

                    return user;
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.user || !options.getItem) return;

            const stored = await options.getItem('user', userId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.user) bot.cache.users.memory.set(userId, stored);
            }

            return stored;
        },
        set: async (user, replaceCurrentValue = false) => {
            if (options.shouldCache?.user && !(await options.shouldCache.user(user))) return;

            // If we are not replacing the current value, we merge the new data with the old data because new one may be partial
            if (!replaceCurrentValue) {
                const oldUser = await bot.cache.users.get((user as unknown as User).id);

                // If we have the old user, we merge the new data with the old data
                if (oldUser) {
                    const keys = Object.keys(user) as (keyof typeof user)[];

                    for (const key of keys) {
                        (oldUser as any)[key] = user[key];
                    }

                    user = oldUser;
                }
            }

            user.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.user) bot.cache.users.memory.set((user as unknown as User).id, user);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.user && options.setItem) await options.setItem('user', user);
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
            if (options.cacheInMemory?.role) {
                // If guilds are cached, roles will be inside them
                if (options.cacheInMemory?.guild) {
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
            if (!options.cacheOutsideMemory?.role || !options.getItem) return;

            const stored = await options.getItem('role', roleId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.role) bot.cache.roles.set(stored);
            }

            return stored;
        },
        set: async (internalRole, replaceCurrentValue = false) => {
            if (options.shouldCache?.role && !(await options.shouldCache.role(internalRole))) return;

            const role = internalRole as unknown as Role;

            // If we are not replacing the current value, we merge the new data with the old data because new one may be partial
            if (!replaceCurrentValue) {
                const oldRole = await bot.cache.roles.get(role.id);

                // If we have the old role, we merge the new data with the old data
                if (oldRole) {
                    const keys = Object.keys(role) as (keyof typeof role)[];

                    for (const key of keys) {
                        (oldRole as any)[key] = role[key];
                    }

                    internalRole = oldRole;
                }
            }

            internalRole.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.role) {
                if (role.guildId) bot.cache.roles.guildIds.set(role.id, role.guildId);

                if (options.cacheInMemory?.guild) {
                    const guildId = bot.cache.roles.guildIds.get(role.id);
                    if (guildId) {
                        const guild = bot.cache.guilds.memory.get(guildId);
                        if (guild) {
                            if (!guild.roles) guild.roles = new Collection();

                            guild.roles.set(role.id, internalRole);
                        } else {
                            const pendingGuild = pendingGuildsData.get(guildId);
                            if (!pendingGuild) pendingGuildsData.set(guildId, { channels: new Collection(), members: new Collection(), roles: new Collection() });

                            pendingGuildsData.get(guildId)?.roles!.set(role.id, internalRole);
                        }
                    } else console.warn(`[CACHE] Can't cache role(${role.id}) since guild.roles is enabled but a guild id was not found.`);
                }
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.role && options.setItem) await options.setItem('role', internalRole);
        },
        delete: async (roleId) => {
            // Handle bulk removal of member roles
            await options.bulk?.removeRole?.(roleId);

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
            if (options.cacheInMemory?.member) {
                // If guilds are cached, members will be inside them
                if (options.cacheInMemory?.guild) {
                    const member = bot.cache.guilds.memory.get(guildId)?.members?.get(memberId);
                    if (member) {
                        member.lastInteractedTime = Date.now();

                        return member;
                    }
                }
            }

            // Otherwise try to get from non-memory cache
            if (!options.cacheOutsideMemory?.member || !options.getItem) return;

            const stored = await options.getItem('member', memberId, guildId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.member) bot.cache.members.set(stored);
            }

            return stored;
        },
        set: async (internalMember, replaceCurrentValue = false) => {
            if (options.shouldCache?.member && !(await options.shouldCache.member(internalMember))) return;

            const member = internalMember as unknown as Member;

            // If we are not replacing the current value, we merge the new data with the old data because new one may be partial
            if (!replaceCurrentValue) {
                const oldRole = await bot.cache.members.get(member.id, member.guildId);

                // If we have the old member, we merge the new data with the old data
                if (oldRole) {
                    const keys = Object.keys(member) as (keyof typeof member)[];

                    for (const key of keys) {
                        (oldRole as any)[key] = member[key];
                    }

                    internalMember = oldRole;
                }
            }

            internalMember.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.member) {
                if (options.cacheInMemory?.guild) {
                    if (member.guildId) {
                        const guild = bot.cache.guilds.memory.get(member.guildId);
                        if (guild) {
                            if (!guild.members) guild.members = new Collection();

                            guild.members.set(member.id, internalMember);
                        } else {
                            const pendingGuild = pendingGuildsData.get(member.guildId);
                            if (!pendingGuild) pendingGuildsData.set(member.guildId, { channels: new Collection(), members: new Collection(), roles: new Collection() });

                            pendingGuildsData.get(member.guildId)?.members!.set(member.id, internalMember);
                        }
                    } else console.warn(`[CACHE] Can't cache member(${member.id}) since guild.members is enabled but a guild id was not found.`);
                }
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.member && options.setItem) await options.setItem('member', internalMember);
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
            if (options.cacheInMemory?.channel) {
                // If guilds are cached, channels will be inside them
                if (options.cacheInMemory?.guild) {
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
            if (!options.cacheOutsideMemory?.channel || !options.getItem) return;

            const stored = await options.getItem('channel', channelId);

            if (stored) {
                stored.lastInteractedTime = Date.now();

                if (options.cacheInMemory?.channel) bot.cache.channels.memory.set(channelId, stored);
            }

            return stored;
        },
        set: async (internalChannel, replaceCurrentValue = false) => {
            if (options.shouldCache?.channel && !(await options.shouldCache.channel(internalChannel))) return;

            const channel = internalChannel as unknown as Channel;

            // If we are not replacing the current value, we merge the new data with the old data because new one may be partial
            if (!replaceCurrentValue) {
                const oldChannel = await bot.cache.channels.get(channel.id);

                // If we have the old channel, we merge the new data with the old data
                if (oldChannel) {
                    const keys = Object.keys(channel) as (keyof typeof channel)[];

                    for (const key of keys) {
                        (oldChannel as any)[key] = channel[key];
                    }

                    internalChannel = oldChannel;
                }
            }

            internalChannel.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.channel) {
                if (channel.guildId) bot.cache.channels.guildIds.set(channel.id, channel.guildId!);

                if (options.cacheInMemory?.guild) {
                    const guildId = bot.cache.channels.guildIds.get(channel.id);
                    if (guildId) {
                        const guild = bot.cache.guilds.memory.get(guildId);
                        if (guild) {
                            if (!guild.channels) guild.channels = new Collection();

                            guild.channels.set(channel.id, internalChannel);
                        } else {
                            const pendingGuild = pendingGuildsData.get(guildId);
                            if (!pendingGuild) pendingGuildsData.set(guildId, { channels: new Collection(), members: new Collection(), roles: new Collection() });

                            pendingGuildsData.get(guildId)?.channels!.set(channel.id, internalChannel);
                        }
                    } else console.warn(`[CACHE] Can't cache channel(${channel.id}) since guild.channels is enabled but a guild id was not found.`);
                } else bot.cache.channels.memory.set(channel.id, internalChannel);
            }
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.channel && options.setItem) await options.setItem('channel', internalChannel);
        },
        delete: async (channelId) => {
            // Handle bulk removal of threads within the channel
            await options.bulk?.removeChannel?.(channelId);

            // Remove from memory
            bot.cache.channels.memory.delete(channelId);
            bot.cache.guilds.memory.get(bot.cache.channels.guildIds.get(channelId)!)?.channels?.delete(channelId);
            bot.cache.channels.guildIds.delete(channelId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('channel', channelId);
        },
    };

    // MAKE SURE TO NOT MOVE THIS BELOW GUILD CUSTOMIZER
    bot.transformers.customizers.member = (_bot, _payload, member) => {
        // If member should be cached, but id is missing, we can't cache it
        if (!('id' in member) && (options.cacheInMemory?.member || options.cacheOutsideMemory?.member)) return console.warn(`[CACHE] Can't cache member since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['member'] = Object.create(baseMember);

        const keys = Object.keys(member) as (keyof typeof member)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.member?.includes(key)) (args as any)[key] = member[key];
            // If undesired we skip
            else if (options.undesiredProps?.member?.includes(key)) continue;
            // If member did not say this is undesired and did not provide any desired props, we accept it
            else if (!options.desiredProps?.member?.length) (args as any)[key] = member[key];
        }

        // Add to memory
        bot.cache.members.set(args);

        // Return dd object instead of cached object, as dd can have more props than cache, so the extra props would be missing in that case
        return member;
    };

    bot.transformers.customizers.user = (_bot, _payload, user) => {
        // If user should be cached, but id is missing, we can't cache it
        if (!('id' in user) && (options.cacheInMemory?.user || options.cacheOutsideMemory?.user)) return console.warn(`[CACHE] Can't cache user since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['user'] = Object.create(baseUser);

        const keys = Object.keys(user) as (keyof typeof user)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.user?.includes(key)) (args as any)[key] = user[key];
            // If undesired we skip
            else if (options.undesiredProps?.user?.includes(key)) continue;
            // If user did not say this is undesired and did not provide any desired props, we accept it
            else if (!options.desiredProps?.user?.length) (args as any)[key] = user[key];
        }

        // Add to memory
        bot.cache.users.set(args);

        // Return dd object instead of cached object, as dd can have more props than cache, so the extra props would be missing in that case
        return user;
    };

    bot.transformers.customizers.guild = (_bot, payload, guild) => {
        // If guild should be cached, but id is missing, we can't cache it
        if (!('id' in guild)) {
            if (options.cacheInMemory?.guild || options.cacheOutsideMemory?.guild) console.warn(`[CACHE] Can't cache guild since id is missing.`);

            return;
        }

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['guild'] = Object.create(baseGuild);

        const keys = Object.keys(guild) as (keyof typeof guild)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.guild?.includes(key as any)) (args as any)[key] = guild[key];
            // If undesired we skip
            else if (options.undesiredProps?.guild?.includes(key as any)) continue;
            // If guild did not say this is undesired and did not provide any desired props, we accept it
            else if (!options.desiredProps?.guild?.length) (args as any)[key] = guild[key];
        }

        // Set approximate member count as member count if payload is from API
        if (payload.approximate_member_count && (options.desiredProps?.guild as (keyof Guild)[])?.includes('memberCount')) (args as unknown as Guild).memberCount = payload.approximate_member_count;

        if (payload.members) {
            for (const member of payload.members) {
                if (member.user) {
                    bot.transformers.member(bot, member, guild.id as Guild['id'], BigInt(member.user.id));
                    bot.transformers.user(bot, member.user);
                }
            }
        }

        // Add to memory
        bot.cache.guilds.set(args);

        // Return dd object instead of cached object, as dd can have more props than cache, so the extra props would be missing in that case
        return guild;
    };

    bot.transformers.customizers.channel = (_bot, _payload, channel) => {
        // If channel should be cached, but id is missing, we can't cache it
        if (!('id' in channel) && (options.cacheInMemory?.channel || options.cacheOutsideMemory?.channel)) return console.warn(`[CACHE] Can't cache channel since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['channel'] = Object.create(baseChannel);

        const keys = Object.keys(channel) as (keyof typeof channel)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.channel?.includes(key)) (args as any)[key] = channel[key];
            // If undesired we skip
            else if (options.undesiredProps?.channel?.includes(key)) continue;
            // If channel did not say this is undesired and did not provide any desired props, we accept it
            else if (!options.desiredProps?.channel?.length) (args as any)[key] = channel[key];
        }

        // Add to memory
        bot.cache.channels.set(args);

        // Return dd object instead of cached object, as dd can have more props than cache, so the extra props would be missing in that case
        return channel;
    };

    bot.transformers.customizers.role = (_bot, _payload, role) => {
        // If role should be cached, but id is missing, we can't cache it
        if (!('id' in role) && (options.cacheInMemory?.role || options.cacheOutsideMemory?.role)) return console.warn(`[CACHE] Can't cache role since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['role'] = Object.create(baseRole);

        const keys = Object.keys(role) as (keyof typeof role)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.role?.includes(key)) (args as any)[key] = role[key];
            // If undesired we skip
            else if (options.undesiredProps?.role?.includes(key)) continue;
            // If role did not say this is undesired and did not provide any desired props, we accept it
            else if (!options.desiredProps?.role?.length) (args as any)[key] = role[key];
        }

        // Add to memory
        bot.cache.roles.set(args);

        // Return dd object instead of cached object, as dd can have more props than cache, so the extra props would be missing in that case
        return role;
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
                for (const [channelId, channel] of bot.cache.channels.memory.entries()) {
                    if (filter.channel?.(channel)) bot.cache.channels.memory.delete(channelId);
                }

            if (filter.guild || filter.channel || filter.member || filter.role)
                for (const [guildId, guild] of bot.cache.guilds.memory.entries()) {
                    if (filter.guild?.(guild)) {
                        bot.cache.guilds.memory.delete(guildId);

                        continue;
                    }

                    if (guild.channels && filter.channel) {
                        for (const [channelId, channel] of guild.channels.entries()) {
                            if (filter.channel?.(channel)) guild.channels?.delete(channelId);
                        }
                    }

                    if (guild.members && filter.member) {
                        for (const [memberId, member] of guild.members.entries()) {
                            if (filter.member?.(member)) guild.members?.delete(memberId);
                        }
                    }

                    if (guild.roles && filter.role) {
                        for (const [roleId, role] of guild.roles.entries()) {
                            if (filter.role?.(role)) guild.roles?.delete(roleId);
                        }
                    }
                }

            if (filter.user)
                for (const [userId, user] of bot.cache.users.memory.entries()) {
                    if (filter.user?.(user)) bot.cache.users.memory.delete(userId);
                }
        }, interval);
    }

    return bot;
};

export type ProxyCacheTypes<Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior> = {
    channel: SetupDesiredProps<Channel, Props, Behavior>;
    guild: Omit<SetupDesiredProps<Guild, Props, Behavior>, 'channels' | 'members' | 'roles'> & {
        channels?: Collection<bigint, LastInteractedTimeTrackedRecord<SetupDesiredProps<Channel, Props, Behavior>>>;
        members?: Collection<bigint, LastInteractedTimeTrackedRecord<SetupDesiredProps<Member, Props, Behavior>>>;
        roles?: Collection<bigint, LastInteractedTimeTrackedRecord<SetupDesiredProps<Role, Props, Behavior>>>;
    };
    member: SetupDesiredProps<Member, Props, Behavior>;
    role: SetupDesiredProps<Role, Props, Behavior>;
    user: SetupDesiredProps<User, Props, Behavior>;
};

// Note: Adding ProxyCacheTypes[K] because TS doesn't provide autocomplete on extends keyof generic, this trick will provide autocomplete
type DesiredPropsArray<T extends ProxyCacheTypes<Props, Behavior>, K extends keyof ProxyCacheTypes<Props, Behavior>, Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior> = Array<keyof T[K] | keyof ProxyCacheTypes<Props, Behavior>[K]>;

export interface CreateProxyCacheOptions<T extends ProxyCacheTypes<Props, Behavior>, Props extends TransformersDesiredProperties, Behavior extends DesiredPropertiesBehavior> {
    /** Configure the exact properties you wish to have in each object. */
    desiredProps?: {
        /** The properties you want to keep in a channel object. */
        channel?: DesiredPropsArray<T, 'channel', Props, Behavior>;
        /** The properties you want to keep in a guild object. */
        guild?: DesiredPropsArray<T, 'guild', Props, Behavior>;
        /** The properties you want to keep in a member object. */
        member?: DesiredPropsArray<T, 'member', Props, Behavior>;
        /** The properties you want to keep in a role object. */
        role?: DesiredPropsArray<T, 'role', Props, Behavior>;
        /** The properties you want to keep in a user object. */
        user?: DesiredPropsArray<T, 'user', Props, Behavior>;
    };
    /** Configure the properties you do NOT want in each object. */
    undesiredProps?: {
        /** The properties you do NOT want in a channel object. */
        channel?: DesiredPropsArray<T, 'channel', Props, Behavior>;
        /** The properties you do NOT want in a guild object. */
        guild?: DesiredPropsArray<T, 'guild', Props, Behavior>;
        /** The properties you do NOT want in a member object. */
        member?: DesiredPropsArray<T, 'member', Props, Behavior>;
        /** The properties you do NOT want in a role object. */
        role?: DesiredPropsArray<T, 'role', Props, Behavior>;
        /** The properties you do NOT want in a user object. */
        user?: DesiredPropsArray<T, 'user', Props, Behavior>;
    };
    /**
     * Options to choose how the proxy will cache everything.
     *
     * By default, all props inside `cacheInMemory` are set to `true`.
     */
    cacheInMemory?: {
        /** Whether or not to cache channels. If guilds is enabled, then these are cached inside the guild object. */
        channel?: boolean;
        /** Whether or not to cache guilds. */
        guild?: boolean;
        /** Whether or not to cache members. If guilds is enabled, then these are cached inside the guild object. */
        member?: boolean;
        /** Whether or not the cache roles. If guilds is enabled, then these are cached inside the guild object.*/
        role?: boolean;
        /** Whether or not to cache users. */
        user?: boolean;
        /** Default value for the properties that are not provided inside `cacheInMemory`. */
        default?: boolean;
    };
    /**
     * Options to choose how the proxy will cache in a separate persitant cache.
     *
     * By default, all props inside `cacheOutsideMemory` are set to `false`.
     */
    cacheOutsideMemory?: {
        /** Whether or not to cache channels. */
        channel?: boolean;
        /** Whether or not to cache guilds. */
        guild?: boolean;
        /** Whether or not to cache members. */
        member?: boolean;
        /** Whether or not to cache roles. */
        role?: boolean;
        /** Whether or not to cache users. */
        user?: boolean;
        /** Default value for the properties that are not provided inside `cacheOutsideMemory`. */
        default?: boolean;
    };
    /** Handler to get an object from a specific table. */
    getItem?: <K extends keyof T>(...args: [table: Exclude<K, 'member'>, id: bigint] | [table: Extract<K, 'member'>, id: bigint, guildId: bigint]) => Promise<FilteredProxyCacheTypes<T, Props, Behavior>[K]>;
    /** Handler to set an object in a specific table. */
    setItem?: <K extends keyof T>(table: K, item: FilteredProxyCacheTypes<T, Props, Behavior>[K]) => Promise<FilteredProxyCacheTypes<T, Props, Behavior>[K]>;
    /** Handler to delete an object in a specific table. */
    removeItem?: <K extends keyof T>(...args: [table: Exclude<K, 'member'>, id: bigint] | [table: Extract<K, 'member'>, id: bigint, guildId: bigint]) => Promise<unknown>;
    /**
     * Options for handling the removal of objects that may trigger bulk modifications or deletions of associated entities.
     *
     * This allows for performance optimization by consolidating multiple operations into a single action, rather than executing hundreds of queries.
     */
    bulk?: {
        /** Handler for the removal of channels and their associated entities (e.g., threads within the channel). */
        removeChannel?: (id: bigint) => Promise<unknown>;
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
            /** Whether or not to replace the internal channel remover. */
            channel?: boolean;
            /** Whether or not to replace the internal guild remover. */
            guild?: boolean;
            /** Whether or not to replace the internal role remover. */
            role?: boolean;
        };
    };
    /** Configure the handlers that should be ran whenever something is about to be cached to determine whether it should or should not be cached. */
    shouldCache?: {
        /** Handler to check whether or not to cache this channel. */
        channel?: (channel: FilteredProxyCacheTypes<T, Props, Behavior>['channel']) => Promise<boolean>;
        /** Handler to check whether or not to cache this guild. */
        guild?: (guild: FilteredProxyCacheTypes<T, Props, Behavior>['guild']) => Promise<boolean>;
        /** Handler to check whether or not to cache this member. */
        member?: (member: FilteredProxyCacheTypes<T, Props, Behavior>['member']) => Promise<boolean>;
        /** Handler to check whether or not to cache this role. */
        role?: (role: FilteredProxyCacheTypes<T, Props, Behavior>['role']) => Promise<boolean>;
        /** Handler to check whether or not to cache this user. */
        user?: (user: FilteredProxyCacheTypes<T, Props, Behavior>['user']) => Promise<boolean>;
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
            channel?: (channel: FilteredProxyCacheTypes<T, Props, Behavior>['channel']) => boolean;
            /** Filter to decide whether or not to remove a guild from the cache. */
            guild?: (guild: FilteredProxyCacheTypes<T, Props, Behavior>['guild']) => boolean;
            /** Filter to decide whether or not to remove a member from the cache. */
            member?: (member: FilteredProxyCacheTypes<T, Props, Behavior>['member']) => boolean;
            /** Filter to decide whether or not to remove a role from the cache. */
            role?: (role: FilteredProxyCacheTypes<T, Props, Behavior>['role']) => boolean;
            /** Filter to decide whether or not to remove a user from the cache. */
            user?: (user: FilteredProxyCacheTypes<T, Props, Behavior>['user']) => boolean;
        };
    };
}

type LastInteractedTimeTrackedRecord<T> = T & {
    /** The UNIX timestamp representing the time this object was last accessed or modified. */
    lastInteractedTime: number;
};
