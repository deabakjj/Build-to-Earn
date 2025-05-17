import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Clock,
  Gift,
  Star,
  ChevronRight,
  PartyPopper,
  Target,
  Timer
} from 'lucide-react';

// Component imports
import SeasonBanner from '../../components/season/SeasonBanner';
import SeasonProgress from '../../components/season/SeasonProgress';
import SeasonReward from '../../components/season/SeasonReward';

// Type imports
import { Season, SeasonEvent, SeasonLeaderboard } from '../../types/Season';

// Season Events Social Page Component
const SocialSeasons: React.FC = () => {
  // States
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<SeasonEvent[]>([]);
  const [activeEvents, setActiveEvents] = useState<SeasonEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<SeasonLeaderboard[]>([]);
  const [playerProgress, setPlayerProgress] = useState({
    seasonPoints: 0,
    rank: 0,
    eventsCompleted: 0,
    rewardsEarned: 0
  });
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hover: { scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
  };

  // Mock data (replace with API calls)
  useEffect(() => {
    fetchSeasonData();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSeasonData = async () => {
    // TODO: Replace with actual API calls
    setCurrentSeason({
      id: 'winter_wonderland_2024',
      name: 'Winter Wonderland',
      description: 'Build the most magical winter creations and compete in festive challenges',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-03-01'),
      theme: {
        name: 'Winter Magic',
        colors: ['#E1F5FE', '#0277BD', '#FFFFFF'],
        effects: ['snow', 'ice', 'aurora'],
        music: 'winter_ambience.mp3'
      },
      rewards: {
        tokens: { VXC: 10000, PTX: 50 },
        items: ['winter_crystal_pickaxe', 'ice_palace_blueprint'],
        titles: ['Winter Master', 'Ice Sculptor'],
        nfts: [{ id: 'winter_special_mount', rarity: 'legendary' }]
      },
      missions: [
        {
          id: 'build_ice_palace',
          name: 'Ice Palace Challenge',
          description: 'Build a magnificent ice palace',
          requirements: { materials: ['ice_blocks', 'crystal'], size: '20x20' },
          rewards: { VXC: 1000, PTX: 5 },
          progress: 0,
          deadline: new Date('2024-12-31')
        }
      ],
      events: [
        {
          id: 'winter_racing',
          name: 'Ice Sled Racing',
          description: 'Race across frozen landscapes',
          type: 'competition',
          participants: [],
          rewards: { VXC: 500, PTX: 2 },
          status: 'active',
          schedule: {
            start: new Date('2024-12-15'),
            end: new Date('2024-12-20'),
            registrationDeadline: new Date('2024-12-14')
          }
        }
      ],
      stats: {
        participants: 15420,
        itemsCreated: 50000,
        eventsCompleted: 1200,
        totalRewardsDistributed: {
          VXC: 5000000,
          PTX: 25000,
          NFTs: 120
        }
      },
      leaderboard: {
        topBuilders: [],
        topGuilds: [],
        topCreators: []
      },
      season: 'winter'
    });

    setUpcomingEvents([
      {
        id: 'guild_building_contest',
        name: 'Guild Building Contest',
        description: 'Work with your guild to create the ultimate winter fortress',
        type: 'guild_competition',
        participants: [],
        rewards: { VXC: 2000, PTX: 10 },
        status: 'upcoming',
        schedule: {
          start: new Date('2024-12-25'),
          end: new Date('2024-12-30'),
          registrationDeadline: new Date('2024-12-23')
        }
      },
      {
        id: 'snowman_championship',
        name: 'Snowman Building Championship',
        description: 'Create the most creative snowman design',
        type: 'solo_competition',
        participants: [],
        rewards: { VXC: 800, PTX: 3 },
        status: 'upcoming',
        schedule: {
          start: new Date('2024-12-28'),
          end: new Date('2024-12-30'),
          registrationDeadline: new Date('2024-12-27')
        }
      }
    ]);

    setActiveEvents([
      {
        id: 'ice_sled_racing',
        name: 'Ice Sled Racing',
        description: 'Race across frozen landscapes with custom sleds',
        type: 'racing',
        participants: [
          { id: 'user1', username: 'SpeedRacer', score: 100 },
          { id: 'user2', username: 'IceMaster', score: 95 }
        ],
        rewards: { VXC: 500, PTX: 2 },
        status: 'active',
        schedule: {
          start: new Date('2024-12-15'),
          end: new Date('2024-12-20'),
          registrationDeadline: new Date('2024-12-14')
        }
      }
    ]);

    setPlayerProgress({
      seasonPoints: 1250,
      rank: 457,
      eventsCompleted: 3,
      rewardsEarned: 12
    });

    setLeaderboard([
      {
        rank: 1,
        player: {
          id: 'user1',
          username: 'WinterKing',
          avatar: '/assets/avatars/winter_king.png',
          level: 25,
          guild: {
            id: 'guild1',
            name: 'Frost Giants',
            icon: '/assets/guilds/frost_giants.png'
          }
        },
        score: 9850,
        achievements: [
          { id: 'ice_master', name: 'Ice Master', icon: '/assets/achievements/ice_master.png' }
        ]
      },
      {
        rank: 2,
        player: {
          id: 'user2',
          username: 'SnowQueen',
          avatar: '/assets/avatars/snow_queen.png',
          level: 23,
          guild: {
            id: 'guild2',
            name: 'Crystal Builders',
            icon: '/assets/guilds/crystal_builders.png'
          }
        },
        score: 9200,
        achievements: [
          { id: 'crystal_artist', name: 'Crystal Artist', icon: '/assets/achievements/crystal_artist.png' }
        ]
      }
    ]);
  };

  const updateCountdown = () => {
    if (!currentSeason) return;
    
    const now = new Date();
    const endDate = new Date(currentSeason.endDate);
    const difference = endDate.getTime() - now.getTime();
    
    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }
  };

  const registerForEvent = async (eventId: string) => {
    // TODO: Implement event registration
    console.log('Registering for event:', eventId);
  };

  return (
    <>
      <Head>
        <title>Season Events - DIY Crafting World</title>
        <meta name="description" content="Participate in seasonal events and compete for rewards" />
      </Head>

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 overflow-hidden"
      >
        {/* Header with Current Season */}
        {currentSeason && <SeasonBanner season={currentSeason} />}

        {/* Season Countdown */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Season Ends In</h2>
              <div className="flex justify-center space-x-4 text-white">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[64px]">
                  <div className="text-2xl font-bold">{timeLeft.days}</div>
                  <div className="text-xs text-gray-300">Days</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[64px]">
                  <div className="text-2xl font-bold">{timeLeft.hours}</div>
                  <div className="text-xs text-gray-300">Hours</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[64px]">
                  <div className="text-2xl font-bold">{timeLeft.minutes}</div>
                  <div className="text-xs text-gray-300">Minutes</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[64px]">
                  <div className="text-2xl font-bold">{timeLeft.seconds}</div>
                  <div className="text-xs text-gray-300">Seconds</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Player Progress Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Season Points</h3>
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{playerProgress.seasonPoints}</p>
              <p className="text-sm text-gray-300">Rank #{playerProgress.rank}</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Events Completed</h3>
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{playerProgress.eventsCompleted}</p>
              <p className="text-sm text-gray-300">This season</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Rewards Earned</h3>
                <Gift className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{playerProgress.rewardsEarned}</p>
              <p className="text-sm text-gray-300">Items collected</p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Time Spent</h3>
                <Timer className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">47h 32m</p>
              <p className="text-sm text-gray-300">In events</p>
            </motion.div>
          </div>

          {/* Active Events */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <PartyPopper className="mr-2" />
                Active Events
              </h2>
              <Link href="/events/all">
                <a className="text-blue-400 hover:text-blue-300 flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map((event) => (
                <motion.div
                  key={event.id}
                  variants={cardVariants}
                  whileHover="hover"
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                        {event.status}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">{event.description}</p>
                    <div className="flex items-center text-sm text-gray-400 mb-4">
                      <Clock className="w-4 h-4 mr-2" />
                      Ends {new Date(event.schedule.end).toLocaleDateString()}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-300">
                        <Users className="w-4 h-4 mr-1" />
                        {event.participants.length} joined
                      </div>
                      <button
                        onClick={() => registerForEvent(event.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Join Event
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Upcoming Events */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Calendar className="mr-2" />
                Upcoming Events
              </h2>
              <Link href="/events/upcoming">
                <a className="text-blue-400 hover:text-blue-300 flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.map((event) => (
                <motion.div
                  key={event.id}
                  variants={cardVariants}
                  whileHover="hover"
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                        {event.status}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">{event.description}</p>
                    <div className="flex items-center text-sm text-gray-400 mb-4">
                      <Calendar className="w-4 h-4 mr-2" />
                      Starts {new Date(event.schedule.start).toLocaleDateString()}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-300">
                        <Trophy className="w-4 h-4 mr-2" />
                        {event.rewards.VXC} VXC + {event.rewards.PTX} PTX
                      </div>
                      <button
                        onClick={() => registerForEvent(event.id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Pre-Register
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Season Leaderboard */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Trophy className="mr-2" />
                Season Leaderboard
              </h2>
              <Link href="/leaderboard">
                <a className="text-blue-400 hover:text-blue-300 flex items-center">
                  Full Rankings <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </Link>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Player</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Guild</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Points</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Achievements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr key={entry.rank} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {entry.rank === 1 && <Trophy className="w-5 h-5 text-yellow-400 mr-2" />}
                            {entry.rank === 2 && <Trophy className="w-5 h-5 text-gray-300 mr-2" />}
                            {entry.rank === 3 && <Trophy className="w-5 h-5 text-orange-400 mr-2" />}
                            <span className="text-white">{entry.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img
                              src={entry.player.avatar}
                              alt={entry.player.username}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <div className="text-white font-medium">{entry.player.username}</div>
                              <div className="text-sm text-gray-400">Level {entry.player.level}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {entry.player.guild && (
                            <div className="flex items-center">
                              <img
                                src={entry.player.guild.icon}
                                alt={entry.player.guild.name}
                                className="w-6 h-6 rounded mr-2"
                              />
                              <span className="text-gray-300">{entry.player.guild.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{entry.score}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-1">
                            {entry.achievements.slice(0, 3).map((achievement) => (
                              <img
                                key={achievement.id}
                                src={achievement.icon}
                                alt={achievement.name}
                                className="w-8 h-8 rounded-full border-2 border-gray-700"
                                title={achievement.name}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
};

export default SocialSeasons;
