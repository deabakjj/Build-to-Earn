import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Settings, 
  Users, 
  Shield, 
  Coins,
  Edit,
  Crown,
  UserMinus,
  UserCheck,
  UserX,
  BarChart3,
  History,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Ban,
  CheckCircle
} from 'lucide-react';

// Type imports
import { Guild, GuildMember, GuildRole, GuildActivity } from '../../types/Guild';

// Guild Management Page Component
const GuildManagement: React.FC = () => {
  // States
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'permissions' | 'resources' | 'settings'>('overview');
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [pendingApplications, setPendingApplications] = useState<GuildMember[]>([]);
  const [activityLog, setActivityLog] = useState<GuildActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [confirmAction, setConfirmAction] = useState<'kick' | 'ban' | 'promote' | 'demote' | null>(null);

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
    fetchGuildManagementData();
  }, []);

  const fetchGuildManagementData = async () => {
    setLoading(true);
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
      perks: [],
      achievements: [],
      events: [],
      leader: null,
      officers: [],
      members: []
    };

    setGuild(guildData);

    // Mock members data
    const mockMembers: GuildMember[] = [
      {
        id: 'member1',
        username: 'CrystalMaster',
        avatar: '/assets/avatars/crystal_master.png',
        role: 'leader',
        joinedAt: new Date('2023-06-15'),
        lastActive: new Date(),
        rank: 'S',
        contributionPoints: 15000,
        permissions: ['all']
      },
      {
        id: 'member2',
        username: 'BuilderPro',
        avatar: '/assets/avatars/builder_pro.png',
        role: 'officer',
        joinedAt: new Date('2023-07-20'),
        lastActive: new Date(Date.now() - 3600000), // 1 hour ago
        rank: 'A',
        contributionPoints: 8500,
        permissions: ['invite', 'kick', 'manage_resources']
      },
      {
        id: 'member3',
        username: 'ArchitectX',
        avatar: '/assets/avatars/architect_x.png',
        role: 'member',
        joinedAt: new Date('2023-08-10'),
        lastActive: new Date(Date.now() - 7200000), // 2 hours ago
        rank: 'B',
        contributionPoints: 3200,
        permissions: ['invite']
      }
    ];

    setMembers(mockMembers);

    // Mock pending applications
    const mockApplications: GuildMember[] = [
      {
        id: 'applicant1',
        username: 'NewBuilder',
        avatar: '/assets/avatars/new_builder.png',
        role: 'applicant',
        joinedAt: new Date(),
        lastActive: new Date(),
        rank: 'C',
        contributionPoints: 0,
        permissions: []
      }
    ];

    setPendingApplications(mockApplications);

    // Mock activity log
    const mockActivity: GuildActivity[] = [
      {
        id: 'activity1',
        type: 'member_join',
        actor: 'ArchitectX',
        target: null,
        action: 'joined the guild',
        timestamp: new Date(Date.now() - 3600000 * 24), // 1 day ago
        details: null
      },
      {
        id: 'activity2',
        type: 'promotion',
        actor: 'CrystalMaster',
        target: 'BuilderPro',
        action: 'promoted to Officer',
        timestamp: new Date(Date.now() - 3600000 * 48), // 2 days ago
        details: null
      },
      {
        id: 'activity3',
        type: 'resource_contribution',
        actor: 'BuilderPro',
        target: null,
        action: 'contributed 500 VXC to guild treasury',
        timestamp: new Date(Date.now() - 3600000 * 72), // 3 days ago
        details: { amount: 500, resource: 'VXC' }
      }
    ];

    setActivityLog(mockActivity);
    setLoading(false);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleMemberAction = (member: GuildMember, action: typeof confirmAction) => {
    setSelectedMember(member);
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const confirmMemberAction = async () => {
    if (!selectedMember || !confirmAction) return;

    // TODO: Implement actual API calls for member actions
    console.log(`${confirmAction} action confirmed for ${selectedMember.username}`);
    
    switch (confirmAction) {
      case 'kick':
        // Remove member from guild
        setMembers(members.filter(m => m.id !== selectedMember.id));
        break;
      case 'ban':
        // Ban member from guild
        // TODO: Add to banned list
        setMembers(members.filter(m => m.id !== selectedMember.id));
        break;
      case 'promote':
        // Promote member to next role
        const updatedMembers = members.map(m => 
          m.id === selectedMember.id ? { ...m, role: 'officer' as GuildRole } : m
        );
        setMembers(updatedMembers);
        break;
      case 'demote':
        // Demote member to previous role
        const demotedMembers = members.map(m => 
          m.id === selectedMember.id ? { ...m, role: 'member' as GuildRole } : m
        );
        setMembers(demotedMembers);
        break;
    }

    setShowConfirmDialog(false);
    setSelectedMember(null);
    setConfirmAction(null);
  };

  const handleApplicationAction = async (applicant: GuildMember, action: 'accept' | 'reject') => {
    // TODO: Implement actual API calls for application actions
    console.log(`${action} application from ${applicant.username}`);
    
    if (action === 'accept') {
      setMembers([...members, { ...applicant, role: 'member' }]);
    }
    
    setPendingApplications(pendingApplications.filter(a => a.id !== applicant.id));
  };

  if (loading || !guild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Guild Management - {guild.name}</title>
        <meta name="description" content="Manage your guild settings, members, and resources" />
      </Head>

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
      >
        {/* Guild Header */}
        <div className="relative">
          <img
            src={guild.banner}
            alt={guild.name}
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between">
                <div className="flex items-center">
                  <img
                    src={guild.icon}
                    alt={guild.name}
                    className="w-24 h-24 rounded-lg border-4 border-white/20 mr-6"
                  />
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{guild.name}</h1>
                    <div className="flex items-center text-gray-300">
                      <Settings className="w-5 h-5 mr-2" />
                      Guild Management
                    </div>
                  </div>
                </div>
                <Link href="/guild/hub">
                  <a className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    Back to Guild Hub
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'permissions', label: 'Permissions', icon: Shield },
                { id: 'resources', label: 'Resources', icon: Coins },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex items-center px-6 py-4 text-sm font-medium rounded-t-lg transition-all ${
                      activeTab === tab.id
                        ? 'text-white bg-white/10 border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-sm text-gray-400">Active Members</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {guild.membersCount}/{guild.maxMembers}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-500/20 rounded-lg">
                        <Coins className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-sm text-gray-400">Guild Treasury</span>
                    </div>
                    <div className="text-2xl font-bold text-white">125,000 VXC</div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-500/20 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-purple-400" />
                      </div>
                      <span className="text-sm text-gray-400">Weekly Activity</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{guild.stats.weeklyActivity}%</div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-yellow-500/20 rounded-lg">
                        <Shield className="w-6 h-6 text-yellow-400" />
                      </div>
                      <span className="text-sm text-gray-400">Guild Rank</span>
                    </div>
                    <div className="text-2xl font-bold text-white">#{guild.rank}</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <History className="w-5 h-5 mr-2" />
                      Recent Activity
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {activityLog.map((activity) => (
                      <div key={activity.id} className="p-6 flex items-center justify-between hover:bg-white/5">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-4" />
                          <div>
                            <p className="text-white">
                              <span className="font-medium">{activity.actor}</span>{' '}
                              {activity.target ? (
                                <>
                                  {activity.action} <span className="font-medium">{activity.target}</span>
                                </>
                              ) : (
                                activity.action
                              )}
                            </p>
                            <p className="text-sm text-gray-400">
                              {activity.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-gray-400">
                          {activity.type === 'member_join' && <UserCheck className="w-4 h-4" />}
                          {activity.type === 'promotion' && <Crown className="w-4 h-4" />}
                          {activity.type === 'resource_contribution' && <Coins className="w-4 h-4" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Applications */}
                {pendingApplications.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                    <div className="p-6 border-b border-white/10">
                      <h2 className="text-xl font-bold text-white flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
                        Pending Applications ({pendingApplications.length})
                      </h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      {pendingApplications.map((applicant) => (
                        <div key={applicant.id} className="p-6 flex items-center justify-between">
                          <div className="flex items-center">
                            <img
                              src={applicant.avatar}
                              alt={applicant.username}
                              className="w-12 h-12 rounded-full mr-4"
                            />
                            <div>
                              <h3 className="text-white font-medium">{applicant.username}</h3>
                              <p className="text-sm text-gray-400">Applied {applicant.joinedAt.toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApplicationAction(applicant, 'accept')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleApplicationAction(applicant, 'reject')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MEMBERS TAB - will continue in next part */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Guild Members</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-300">Members content will be implemented in next iteration.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs placeholders */}
            {activeTab !== 'overview' && activeTab !== 'members' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                <p className="mt-4 text-gray-300">This tab content will be implemented in the next iteration.</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default GuildManagement;
