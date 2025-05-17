// This file contains the remaining part of GuildHub.tsx that needs to be merged
// with the main file to complete the MY GUILD, EVENTS, and RANKINGS tabs

// Continue MY GUILD tab from where it left off
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
