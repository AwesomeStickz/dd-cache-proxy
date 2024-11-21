import { Bot, Channel, Collection, Guild, Member, Role, User, type DesiredPropertiesBehavior, type SetupDesiredProps, type TransformersDesiredProperties } from '@discordeno/bot';
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
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['channel']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        guilds: {
            memory: Collection<bigint, FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild']>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['guild']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        members: {
            get: (id: bigint, guildId: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['member'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['member']) => Promise<void>;
            delete: (id: bigint, guildId: bigint) => Promise<void>;
        };
        roles: {
            guildIds: Collection<bigint, bigint>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['role'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['role']) => Promise<void>;
            delete: (id: bigint) => Promise<void>;
        };
        users: {
            memory: Collection<bigint, FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user']>;
            get: (id: bigint) => Promise<FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user'] | undefined>;
            set: (value: FilteredProxyCacheTypes<T, DiscordenoDesiredProps, DiscordenoDesiredPropsBehavior, O>['user']) => Promise<void>;
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

    if (!bot.cache.options.cacheInMemory) bot.cache.options.cacheInMemory = { default: true };
    if (!bot.cache.options.cacheOutsideMemory) bot.cache.options.cacheOutsideMemory = { default: false };

    const cacheInMemoryDefault = bot.cache.options.cacheInMemory.default;
    const cacheOutsideMemoryDefault = bot.cache.options.cacheOutsideMemory.default;

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
        removeGuild: async (id: bigint) => {
            // Remove from memory
            bot.cache.guilds.memory.delete(id);

            // Remove any associated channels
            bot.cache.channels.memory.forEach((channel) => {
                if ((channel as unknown as Channel).guildId === id) {
                    bot.cache.channels.memory.delete((channel as unknown as Channel).id);
                    bot.cache.channels.guildIds.delete((channel as unknown as Channel).id);
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
                        if ((member as unknown as Member).roles?.includes(id)) (member as unknown as Member).roles = (member as unknown as Member).roles.filter((roleId) => roleId !== id);
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
        set: async (guild) => {
            // Should this be cached or not?
            if (options.shouldCache?.guild && !(await options.shouldCache.guild(guild))) return;

            guild.lastInteractedTime = Date.now();

            // If user wants memory cache, we cache it
            if (options.cacheInMemory?.guild) bot.cache.guilds.memory.set((guild as unknown as Guild).id, guild);
            // If user wants non-memory cache, we cache it
            if (options.cacheOutsideMemory?.guild && options.setItem) await options.setItem('guild', guild);
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
        set: async (user) => {
            if (options.shouldCache?.user && !(await options.shouldCache.user(user))) return;

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
        set: async (internalRole) => {
            if (options.shouldCache?.role && !(await options.shouldCache.role(internalRole))) return;

            internalRole.lastInteractedTime = Date.now();

            const role = internalRole as unknown as Role;

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
        set: async (internalMember) => {
            if (options.shouldCache?.member && !(await options.shouldCache.member(internalMember))) return;

            internalMember.lastInteractedTime = Date.now();

            const member = internalMember as unknown as Member;

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
        set: async (internalChannel) => {
            if (options.shouldCache?.channel && !(await options.shouldCache.channel(internalChannel))) return;

            internalChannel.lastInteractedTime = Date.now();

            const channel = internalChannel as unknown as Channel;

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
            // Remove from memory
            bot.cache.channels.memory.delete(channelId);
            bot.cache.guilds.memory.get(bot.cache.channels.guildIds.get(channelId)!)?.channels?.delete(channelId);
            bot.cache.channels.guildIds.delete(channelId);

            // Remove from non-memory cache
            if (options.removeItem) await options.removeItem('channel', channelId);
        },
    };

    // MAKE SURE TO NOT MOVE THIS BELOW GUILD CUSTOMIZER
    bot.transformers.customizers.member = (_, _payload, old) => {
        if (!('id' in old)) return console.warn(`[CACHE] Can't cache member since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['member'] = {};

        const keys = Object.keys(old) as (keyof typeof old)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.member?.includes(key)) (args as any)[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.member?.includes(key)) continue;
            // If member did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.member?.length) (args as any)[key] = old[key];
        }

        // Add to memory
        bot.cache.members.set(args);

        return args;
    };

    bot.transformers.customizers.user = (_, _payload, old) => {
        if (!('id' in old)) return console.warn(`[CACHE] Can't cache user since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['user'] = {};

        const keys = Object.keys(old) as (keyof typeof old)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.user?.includes(key)) (args as any)[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.user?.includes(key)) continue;
            // If user did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.user?.length) (args as any)[key] = old[key];
        }

        // Add to memory
        bot.cache.users.set(args);

        return args;
    };

    bot.transformers.customizers.guild = (_, payload, old) => {
        if (!('id' in old)) return console.warn(`[CACHE] Can't cache guild since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['guild'] = {};

        const keys = Object.keys(old) as (keyof typeof old)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.guild?.includes(key as any)) (args as any)[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.guild?.includes(key as any)) continue;
            // If guild did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.guild?.length) (args as any)[key] = old[key];
        }

        const pendingGuildData = pendingGuildsData.get(old.id as Guild['id']);

        if (pendingGuildData) {
            pendingGuildsData.delete(old.id as Guild['id']);

            if (pendingGuildData.channels?.size) args.channels = new Collection([...pendingGuildData.channels, ...(args.channels || [])]);
            if (pendingGuildData.members?.size) args.members = new Collection([...pendingGuildData.members, ...(args.members || [])]);
            if (pendingGuildData.roles?.size) args.roles = new Collection([...pendingGuildData.roles, ...(args.roles || [])]);
        }

        // Update last interacted time for all channels, members and roles
        if (args.channels) args.channels = new Collection(args.channels.array().map((channel) => [(channel as unknown as Channel).id, { ...channel, lastInteractedTime: Date.now() }]));
        if (args.members) args.members = new Collection(args.members.array().map((member) => [(member as unknown as Member).id, { ...member, lastInteractedTime: Date.now() }]));
        if (args.roles) args.roles = new Collection(args.roles.array().map((role) => [(role as unknown as Role).id, { ...role, lastInteractedTime: Date.now() }]));

        // Set approximate member count as member count if payload is from API
        if (payload.approximate_member_count && (options.desiredProps?.guild as (keyof Guild)[])?.includes('memberCount')) (args as unknown as Guild).memberCount = payload.approximate_member_count;

        // Add to memory
        bot.cache.guilds.set(args);

        if (payload.members) {
            for (const member of payload.members) {
                if (member.user) {
                    bot.transformers.member(bot, member, old.id as Guild['id'], BigInt(member.user.id));
                    bot.transformers.user(bot, member.user);
                }
            }
        }

        return args;
    };

    bot.transformers.customizers.channel = (_, _payload, old) => {
        if (!('id' in old)) return console.warn(`[CACHE] Can't cache channel since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['channel'] = {};

        const keys = Object.keys(old) as (keyof typeof old)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.channel?.includes(key)) (args as any)[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.channel?.includes(key)) continue;
            // If channel did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.channel?.length) (args as any)[key] = old[key];
        }

        // Add to memory
        bot.cache.channels.set(args);

        return args;
    };

    bot.transformers.customizers.role = (_, _payload, old) => {
        if (!('id' in old)) return console.warn(`[CACHE] Can't cache role since id is missing.`);

        // Filter to desired args
        // @ts-ignore
        const args: FilteredProxyCacheTypes<T, Props, Behavior>['role'] = {};

        const keys = Object.keys(old) as (keyof typeof old)[];

        for (const key of keys) {
            // ID is required. Desired props take priority.
            if (key === 'id' || options.desiredProps?.role?.includes(key)) (args as any)[key] = old[key];
            // If undesired we skip
            else if (options.undesiredProps?.role?.includes(key)) continue;
            // If role did not say this is undesired and did not provide any desired props we accept it
            else if (!options.desiredProps?.role?.length) (args as any)[key] = old[key];
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
                    if (filter.channel?.(channel)) bot.cache.channels.memory.delete((channel as unknown as Channel).id);
                });

            if (filter.guild || filter.channel || filter.member || filter.role)
                bot.cache.guilds.memory.forEach((guild): boolean | void => {
                    if (filter.guild?.(guild)) return bot.cache.guilds.memory.delete((guild as unknown as Guild).id);

                    if (guild.channels && filter.channel)
                        guild.channels.forEach((channel) => {
                            if (filter.channel?.(channel)) guild.channels?.delete((channel as unknown as Channel).id);
                        });

                    if (guild.members && filter.member)
                        guild.members.forEach((member) => {
                            if (filter.member?.(member)) guild.members?.delete((member as unknown as Member).id);
                        });

                    if (guild.roles && filter.role)
                        guild.roles.forEach((role) => {
                            if (filter.role?.(role)) guild.roles?.delete((role as unknown as Role).id);
                        });
                });

            if (filter.user)
                bot.cache.users.memory.forEach((user) => {
                    if (filter.user?.(user)) bot.cache.users.memory.delete((user as unknown as User).id);
                });
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
        default: boolean;
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
        default: boolean;
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
