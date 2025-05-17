import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Users, 
  MessageCircle, 
  Trophy, 
  Calendar,
  UserPlus,
  Search,
  Star,
  ArrowRight
} from 'lucide-react';

// Component imports
import FriendList from '../components/social/FriendList';
import Chat from '../components/social/Chat';
import Guild from '../components/social/Guild';

// Type imports
import { User, Friend, ChatMessage, Guild as GuildType } from '../types/Social';

// Social Main Page Component
const Social: React.FC = () => {
  // States
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'guild'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({
    friendsCount: 0,
    guildsCount: 0,
    eventsAttended: 0,
    socialScore: 0
  });

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const tabVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  };

  // Mock data (replace with API calls)
  useEffect(() => {
    // Fetch user data
    fetchSocialData();
  }, []);

  const fetchSocialData = async () => {
    // TODO: Replace with actual API calls
    setFriends([
      {
        id: '1',
        userId: 'user1',
        friendId: 'user2',
        status: 'accepted',
        createdAt: new Date(),
        friend: {
          id: 'user2',
          username: 'CraftMaster',
          email: 'craft@example.com',
          avatar: '/assets/avatars/avatar1.png',
          level: 15,
          guild: {
            id: 'guild1',
            name: 'Sky Builders',
            membersCount: 24,
            rank: 5,
            icon: '/assets/guilds/icon1.png'
          },
          stats: {
            itemsCreated: 150,
            buildsCompleted: 75,
            nftsSold: 30,
            totalEarnings: 1250
          },
          isOnline: true,
          lastSeen: new Date()
        }
      }
    ]);

    setUserStats({
      friendsCount: 28,
      guildsCount: 2,
      eventsAttended: 12,
      socialScore: 850
    });

    setRecentActivities([
      {
        id: '1',
        type: 'friend_added',
        user: 'BuilderPro',
        message: 'You are now friends with BuilderPro',
        time: '2 minutes ago',
        icon: <UserPlus className="w-4 h-4" />
      },
      {
        id: '2',
        type: 'guild_event',
        user: 'Sky Builders',
        message: 'Guild event: Winter Construction Challenge started',
        time: '1 hour ago',
        icon: <Calendar className="w-4 h-4" />
      }
    ]);
  };

  const handleAddFriend = async (userId: string) => {
    // TODO: Implement friend request functionality
    console.log('Adding friend:', userId);
  };

  const handleTabChange = (tab: 'friends' | 'chat' | 'guild') => {
    setActiveTab(tab);
  };

  return (
    <>
      <Head>
        <title>Social Hub - DIY Crafting World</title>
        <meta name="description" content="Connect with friends, join guilds, and participate in events" />
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
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Users className="mr-2" />
                  Social Hub
                </h1>
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  {onlineUsers.length} Online
                </span>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search friends, guilds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Stats Dashboard */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Friends</p>
                  <p className="text-2xl font-bold text-white">{userStats.friendsCount}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Guilds</p>
                  <p className="text-2xl font-bold text-white">{userStats.guildsCount}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Events</p>
                  <p className="text-2xl font-bold text-white">{userStats.eventsAttended}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-400" />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Social Score</p>
                  <p className="text-2xl font-bold text-white">{userStats.socialScore}</p>
                </div>
                <Star className="w-8 h-8 text-purple-400" />
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Navigation and Quick Actions */}
            <div className="lg:col-span-1">
              {/* Navigation Tabs */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-6">
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleTabChange('friends')}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      activeTab === 'friends' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-3" />
                      <span>Friends</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleTabChange('chat')}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      activeTab === 'chat' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-3" />
                      <span>Chat</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleTabChange('guild')}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      activeTab === 'guild' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Trophy className="w-5 h-5 mr-3" />
                      <span>Guild</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activities</h3>
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{activity.message}</p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <motion.div
                key={activeTab}
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg"
              >
                {activeTab === 'friends' && (
                  <FriendList
                    friends={friends}
                    friendRequests={friendRequests}
                    onAddFriend={handleAddFriend}
                    searchQuery={searchQuery}
                  />
                )}

                {activeTab === 'chat' && (
                  <Chat
                    friends={friends}
                    onlineUsers={onlineUsers}
                  />
                )}

                {activeTab === 'guild' && (
                  <Guild
                    userGuilds={[]}
                    availableGuilds={[]}
                    onJoinGuild={(guildId) => console.log('Joining guild:', guildId)}
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 flex justify-center space-x-4">
            <Link href="/social/seasons">
              <a className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg text-blue-300 transition-all">
                Season Events
              </a>
            </Link>
            <Link href="/guild/hub">
              <a className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 rounded-lg text-purple-300 transition-all">
                Guild Hub
              </a>
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Social;
