import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Sword, 
  Crown, 
  Shield, 
  Trophy, 
  Users,
  Star,
  Search,
  Filter,
  Plus,
  ChevronRight,
  Award,
  Target,
  Briefcase,
  TrendingUp,
  Calendar,
  PartyPopper
} from 'lucide-react';

// Type imports
import { Guild, GuildMember, GuildEvent, GuildStats } from '../../types/Guild';

// Guild Hub Page Component
const GuildHub: React.FC = () => {
  // States
  const [activeTab, setActiveTab] = useState<'discover' | 'myGuild' | 'events' | 'rankings'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'recruiting' | 'competitive' | 'casual'>('all');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [featuredGuilds, setFeaturedGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [guildRankings, setGuildRankings] = useState<Guild[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GuildEvent[]>([]);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hover: { scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
  };

  const tabVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  };

  // Mock data (replace with API calls)
  useEffect(() => {
    fetchGuildData();
  }, [activeTab, filterCategory]);

  const fetchGuildData = async () => {
    // TODO: Replace with actual API calls
    const guildData: Guild = {
      id: 'guild_crystal_builders',
      name: 'Crystal Builders',
      description: 'Master artisans specializing in crystal architecture and magical constructs',
      icon: '/assets/guilds/crystal_builders.png',
      banner: '/assets/guilds/banners/crystal_builders.jpg',
      level: 15,
      membersCount: 48,
      maxMembers: 50,
      rank: 3,
      category: 'competitive',
      founded: new Date('2023-06-15'),
      requirements: {
        minLevel: 10,
        minBuildScore: 500,
        application: true
      },
      stats: {
        totalBuildValue: 1250000,
        totalMembers: 48,
        totalAchievements: 89,
        weeklyActivity: 95,
        membershipGrowth: 15,
        averageContribution: 2500
      },
      perks: [
        { id: 'crystal_boost', name: 'Crystal Resource Boost', description: '+20% crystal gathering', icon: '💎' },
        { id: 'build_speed', name: 'Enhanced Building', description: '+15% building speed', icon: '⚡' },
        { id: 'guild_storage', name: 'Guild Vault', description: '10,000 slot shared storage', icon: '📦' }
      ],
      achievements: [
        { id: 'master_builders', name: 'Master Builders', description: 'Complete 1000 builds as a guild', icon: '🏗️', unlockedAt: new Date() },
        { id: 'top_tier', name: 'Top Tier Guild', description: 'Reach top 5 in seasonal rankings', icon: '🏆', unlockedAt: new Date() }
      ],
      events: [],
      leader: {
        id: 'user1',
        username: 'CrystalMaster',
        email: 'crystal@example.com',
        avatar: '/assets/avatars/crystal_master.png',
        level: 45,
        guild: this,
        role: 'leader',
        joinedAt: new Date('2023-06-15'),
        stats: {
          itemsCreated: 500,
          buildsCompleted: 200,
          nftsSold: 50,
          totalEarnings: 25000
        },
        isOnline: true,
        lastSeen: new Date()
      },
      officers: [],
      members: []
    };

    if (activeTab === 'myGuild') {
      setMyGuild(guildData);
    }

    setFeaturedGuilds([
      guildData,
      {
        ...guildData,
        id: 'guild_sky_architects',
        name: 'Sky Architects',
        description: 'Builders of magnificent floating cities and aerial structures',
        icon: '/assets/guilds/sky_architects.png',
        level: 20,
        membersCount: 50,
        rank: 1,
        category: 'competitive'
      },
      {
        ...guildData,
        id: 'guild_earth_movers',
        name: 'Earth Movers',
        description: 'Specialists in large-scale terrain modification and underground complexes',
        icon: '/assets/guilds/earth_movers.png',
        level: 18,
        membersCount: 45,
        rank: 2,
        category: 'competitive'
      }
    ]);

    setGuilds([
      ...featuredGuilds,
      {
        ...guildData,
        id: 'guild_creative_minds',
        name: 'Creative Minds',
        description: 'Casual builders focused on artistic expression',
        level: 10,
        membersCount: 30,
        rank: 15,
        category: 'casual'
      },
      {
        ...guildData,
        id: 'guild_guild_recruiters',
        name: 'Builder Brigade',
        description: 'Always recruiting new members! All skill levels welcome',
        level: 8,
        membersCount: 20,
        rank: 25,
        category: 'recruiting'
      }
    ]);

    setGuildRankings([
      ...featuredGuilds.sort((a, b) => a.rank - b.rank)
    ]);

    setUpcomingEvents([
      {
        id: 'guild_war_1',
        name: 'Guild War: Territory Expansion',
        description: 'Claim new territories through massive building projects',
        type: 'competition',
        participants: ['guild_sky_architects', 'guild_earth_movers', 'guild_crystal_builders'],
        rewards: { 
          VXC: 10000, 
          PTX: 50,
          territories: ['northern_highlands', 'eastern_peaks']
        },
        schedule: {
          start: new Date('2024-12-20'),
          end: new Date('2024-12-27'),
          registrationDeadline: new Date('2024-12-18')
        },
        status: 'upcoming'
      },
      {
        id: 'build_off_1',
        name: 'Inter-Guild Build-Off',
        description: 'Showcase your guild\'s best builders in a timed challenge',
        type: 'showcase',
        participants: [],
        rewards: { 
          VXC: 5000, 
          PTX: 25,
          recognition: 'Builder\'s Trophy'
        },
        schedule: {
          start: new Date('2024-12-15'),
          end: new Date('2024-12-17'),
          registrationDeadline: new Date('2024-12-13')
        },
        status: 'active'
      }
    ]);
  };

  const handleJoinGuild = async (guildId: string) => {
    // TODO: Implement guild join functionality
    console.log('Joining guild:', guildId);
  };

  const handleCreateGuild = () => {
    // TODO: Implement guild creation flow
    console.log('Creating new guild');
  };

  const filteredGuilds = guilds.filter(guild => {
    const matchesSearch = guild.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guild.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || guild.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Head>
        <title>Guild Hub - DIY Crafting World</title>
        <meta name="description" content="Join a guild, participate in guild events, and compete for glory" />
      </Head>

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Shield className="mr-2" />
                  Guild Hub
                </h1>
                <span className="ml-4 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  {guilds.length} Active Guilds
                </span>
              </div>
              
              <button
                onClick={handleCreateGuild}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg flex items-center transition-all transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Guild
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { id: 'discover', label: 'Discover', icon: Search },
                { id: 'myGuild', label: 'My Guild', icon: Crown },
                { id: 'events', label: 'Guild Events', icon: Trophy },
                { id: 'rankings', label: 'Rankings', icon: Award }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - will continue in next part */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Tab content for all tabs implemented below */}
            {/* DISCOVER TAB */}
            {activeTab === 'discover' && (
              <div>
                {/* Search and Filter */}
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search guilds..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value as any)}
                      className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">All Guilds</option>
                      <option value="recruiting">Recruiting</option>
                      <option value="competitive">Competitive</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>

                {/* Featured Guilds */}
                <section className="mb-12">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-400" />
                    Featured Guilds
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredGuilds.map((guild) => (
                      <motion.div
                        key={guild.id}
                        variants={cardVariants}
                        whileHover="hover"
                        className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden"
                      >
                        {/* Guild Banner */}
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={guild.banner}
                            alt={guild.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/80 text-white text-xs rounded flex items-center">
                            <Award className="w-3 h-3 mr-1" />
                            #{guild.rank}
                          </div>
                        </div>

                        {/* Guild Info */}
                        <div className="p-6">
                          <div className="flex items-center mb-3">
                            <img
                              src={guild.icon}
                              alt={guild.name}
                              className="w-12 h-12 rounded-lg border border-white/20 mr-3"
                            />
                            <div>
                              <h3 className="text-lg font-bold text-white">{guild.name}</h3>
                              <p className="text-sm text-gray-300">
                                Level {guild.level} • {guild.membersCount}/{guild.maxMembers} members
                              </p>
                            </div>
                          </div>

                          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                            {guild.description}
                          </p>

                          {/* Guild Stats */}
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-xs text-gray-400">Build Value</div>
                              <div className="text-sm font-bold text-white">
                                {(guild.stats.totalBuildValue / 1000).toFixed(0)}K
                              </div>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-xs text-gray-400">Achievements</div>
                              <div className="text-sm font-bold text-white">
                                {guild.stats.totalAchievements}
                              </div>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-xs text-gray-400">Activity</div>
                              <div className="text-sm font-bold text-white">
                                {guild.stats.weeklyActivity}%
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleJoinGuild(guild.id)}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Join Guild
                            </button>
                            <Link href={`/guild/${guild.id}`}>
                              <a className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors flex items-center justify-center">
                                <ChevronRight className="w-4 h-4" />
                              </a>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* All Guilds */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-4">All Guilds</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {filteredGuilds.map((guild) => (
                      <motion.div
                        key={guild.id}
                        variants={cardVariants}
                        whileHover="hover"
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <img
                              src={guild.icon}
                              alt={guild.name}
                              className="w-16 h-16 rounded-lg border border-white/20 mr-4"
                            />
                            <div>
                              <div className="flex items-center">
                                <h3 className="text-lg font-bold text-white mr-3">{guild.name}</h3>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                  {guild.category}
                                </span>
                                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                                  #{guild.rank}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm mt-1">{guild.description}</p>
                              <div className="flex items-center mt-2 text-sm text-gray-400">
                                <Users className="w-4 h-4 mr-1" />
                                {guild.membersCount}/{guild.maxMembers} members
                                <span className="mx-2">•</span>
                                <Star className="w-4 h-4 mr-1" />
                                Level {guild.level}
                                <span className="mx-2">•</span>
                                <Trophy className="w-4 h-4 mr-1" />
                                {guild.stats.totalAchievements} achievements
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Link href={`/guild/${guild.id}`}>
                              <a className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                                View Details
                              </a>
                            </Link>
                            <button
                              onClick={() => handleJoinGuild(guild.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* MY GUILD TAB */}
            {activeTab === 'myGuild' && myGuild && (
              <div className="space-y-8">
                {/* Guild Header */}
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={myGuild.banner}
                    alt={myGuild.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-end justify-between">
                      <div className="flex items-center">
                        <img
                          src={myGuild.icon}
                          alt={myGuild.name}
                          className="w-24 h-24 rounded-lg border-4 border-white/20 mr-6"
                        />
                        <div>
                          <h1 className="text-3xl font-bold text-white mb-2">{myGuild.name}</h1>
                          <div className="flex items-center text-gray-300">
                            <Sword className="w-5 h-5 mr-2" />
                            Rank #{myGuild.rank}
                            <span className="mx-3">•</span>
                            <Star className="w-5 h-5 mr-2" />
                            Level {myGuild.level}
                            <span className="mx-3">•</span>
                            <Users className="w-5 h-5 mr-2" />
                            {myGuild.membersCount} members
                          </div>
                        </div>
                      </div>
                      <Link href="/guild/management">
                        <a className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          Manage Guild
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Guild Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Guild Performance</h3>
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weekly Activity</span>
                        <span className="text-white font-medium">{myGuild.stats.weeklyActivity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Contribution</span>
                        <span className="text-white font-medium">{myGuild.stats.averageContribution} VXC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Member Growth</span>
                        <span className="text-green-400 font-medium">+{myGuild.stats.membershipGrowth}%</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Guild Resources</h3>
                      <Briefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">VXC Treasury</span>
                        <span className="text-white font-medium">125,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">PTX Holdings</span>
                        <span className="text-white font-medium">450</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shared Items</span>
                        <span className="text-white font-medium">1,234</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Active Projects</h3>
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Crystal Spire</span>
                          <span className="text-white text-sm">75%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Guild Hall Upgrade</span>
                          <span className="text-white text-sm">45%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Guild Perks and Achievements */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-400" />
                      Guild Perks
                    </h3>
                    <div className="space-y-3">
                      {myGuild.perks.map((perk) => (
                        <div key={perk.id} className="flex items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-2xl mr-3">{perk.icon}</span>
                          <div>
                            <h4 className="text-white font-medium">{perk.name}</h4>
                            <p className="text-sm text-gray-400">{perk.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                      Recent Achievements
                    </h3>
                    <div className="space-y-3">
                      {myGuild.achievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-2xl mr-3">{achievement.icon}</span>
                          <div>
                            <h4 className="text-white font-medium">{achievement.name}</h4>
                            <p className="text-sm text-gray-400">{achievement.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Unlocked {achievement.unlockedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity and Quick Actions */}
                <div className="flex justify-between items-center">
                  <Link href="/guild/projects">
                    <a className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      View All Projects
                    </a>
                  </Link>
                  <Link href="/guild/management">
                    <a className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Guild Settings
                    </a>
                  </Link>
                </div>
              </div>
            )}

            {/* GUILD EVENTS TAB */}
            {activeTab === 'events' && (
              <div className="space-y-8">
                {/* Active Events */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                    Active Guild Events
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingEvents.filter(event => event.status === 'active').map((event) => (
                      <motion.div
                        key={event.id}
                        variants={cardVariants}
                        whileHover="hover"
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">{event.name}</h3>
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                            Active
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-4">{event.description}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-400">
                            <Calendar className="w-4 h-4 mr-2" />
                            Ends: {event.schedule.end.toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm text-gray-400">
                            <Users className="w-4 h-4 mr-2" />
                            {event.participants.length} guilds participating
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-4">
                          <h4 className="text-sm font-medium text-white mb-2">Rewards:</h4>
                          <div className="flex items-center text-sm text-gray-300">
                            <div className="bg-blue-500/20 px-2 py-1 rounded mr-2">
                              {event.rewards.VXC} VXC
                            </div>
                            <div className="bg-purple-500/20 px-2 py-1 rounded">
                              {event.rewards.PTX} PTX
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Upcoming Events */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                    Upcoming Events
                  </h2>
                  <div className="space-y-4">
                    {upcomingEvents.filter(event => event.status === 'upcoming').map((event) => (
                      <motion.div
                        key={event.id}
                        variants={cardVariants}
                        whileHover="hover"
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-bold text-white">{event.name}</h3>
                              <span className="ml-3 px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                                {event.status}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-3">{event.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="text-gray-400">
                                <div className="text-xs uppercase">Start Date</div>
                                <div className="text-white">{event.schedule.start.toLocaleDateString()}</div>
                              </div>
                              <div className="text-gray-400">
                                <div className="text-xs uppercase">Duration</div>
                                <div className="text-white">
                                  {Math.ceil((event.schedule.end.getTime() - event.schedule.start.getTime()) / (1000 * 60 * 60 * 24))} days
                                </div>
                              </div>
                              <div className="text-gray-400">
                                <div className="text-xs uppercase">Registration</div>
                                <div className="text-white">Until {event.schedule.registrationDeadline.toLocaleDateString()}</div>
                              </div>
                              <div className="text-gray-400">
                                <div className="text-xs uppercase">Rewards</div>
                                <div className="text-white">{event.rewards.VXC} VXC + {event.rewards.PTX} PTX</div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6">
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                              Register Guild
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* RANKINGS TAB */}
            {activeTab === 'rankings' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-400" />
                  Guild Rankings
                </h2>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Guild</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Level</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Members</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Build Value</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Achievements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guildRankings.map((guild) => (
                          <tr key={guild.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                {guild.rank === 1 && <Crown className="w-5 h-5 text-yellow-400 mr-2" />}
                                {guild.rank === 2 && <Crown className="w-5 h-5 text-gray-300 mr-2" />}
                                {guild.rank === 3 && <Crown className="w-5 h-5 text-orange-400 mr-2" />}
                                <span className="text-white font-medium">#{guild.rank}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <img
                                  src={guild.icon}
                                  alt={guild.name}
                                  className="w-10 h-10 rounded-lg mr-3"
                                />
                                <div>
                                  <div className="text-white font-medium">{guild.name}</div>
                                  <div className="text-sm text-gray-400">{guild.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white">{guild.level}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white">{guild.membersCount}/{guild.maxMembers}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white">{(guild.stats.totalBuildValue / 1000).toFixed(0)}K VXC</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white">{guild.stats.totalAchievements}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Guild Comparison */}
                <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Guild Performance Metrics</h3>
                  <div className="h-64">
                    {/* TODO: Add chart component for guild comparison */}
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Performance comparison chart will be implemented here
                    </div>
                  </div>
                </div>
              </div>
            )}


          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default GuildHub;
