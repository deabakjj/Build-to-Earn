import React, { useState } from 'react';
import { Guild as IGuild, GuildMember, GuildRole, GuildPermission, GuildStatus } from '../../types/Guild';
import { 
  Shield, 
  Crown, 
  Users, 
  Calendar, 
  Trophy, 
  Settings, 
  ChevronRight,
  UserPlus,
  MessageCircle,
  DollarSign,
  Target,
  Activity,
  Search,
  MoreVertical,
  User,
  Star,
  Edit2,
  Trash2,
  LogOut,
  Ban,
  Plus
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';

interface GuildProps {
  guild: IGuild;
  currentMember?: GuildMember;
  onInviteMember?: () => void;
  onLeaveGuild?: () => void;
  onManageGuild?: () => void;
  onViewEvents?: () => void;
  onViewProjects?: () => void;
  onViewTreasury?: () => void;
  onCreateEvent?: () => void;
  onCreateProject?: () => void;
  onMessageMember?: (memberId: string) => void;
  onPromoteMember?: (memberId: string, newRole: GuildRole) => void;
  onKickMember?: (memberId: string) => void;
  className?: string;
}

const Guild: React.FC<GuildProps> = ({
  guild,
  currentMember,
  onInviteMember,
  onLeaveGuild,
  onManageGuild,
  onViewEvents,
  onViewProjects,
  onViewTreasury,
  onCreateEvent,
  onCreateProject,
  onMessageMember,
  onPromoteMember,
  onKickMember,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'events' | 'projects' | 'treasury'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMemberOptions, setShowMemberOptions] = useState<string | null>(null);

  // 권한 확인
  const hasPermission = (permission: GuildPermission): boolean => {
    return currentMember?.permissions.includes(permission) || false;
  };

  // 역할별 색상
  const getRoleColor = (role: GuildRole): string => {
    switch (role) {
      case GuildRole.LEADER:
        return 'text-purple-600 bg-purple-100';
      case GuildRole.OFFICER:
        return 'text-blue-600 bg-blue-100';
      case GuildRole.VETERAN:
        return 'text-green-600 bg-green-100';
      case GuildRole.MEMBER:
        return 'text-gray-600 bg-gray-100';
      case GuildRole.RECRUIT:
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // 상태별 색상
  const getStatusColor = (status: GuildStatus): string => {
    switch (status) {
      case GuildStatus.ACTIVE:
        return 'text-green-600 bg-green-50';
      case GuildStatus.RECRUITING:
        return 'text-blue-600 bg-blue-50';
      case GuildStatus.INACTIVE:
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 멤버 필터링
  const filteredMembers = guild.members.filter(member =>
    member.username.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // 역할별 멤버 분류
  const membersByRole = {
    [GuildRole.LEADER]: filteredMembers.filter(m => m.role === GuildRole.LEADER),
    [GuildRole.OFFICER]: filteredMembers.filter(m => m.role === GuildRole.OFFICER),
    [GuildRole.VETERAN]: filteredMembers.filter(m => m.role === GuildRole.VETERAN),
    [GuildRole.MEMBER]: filteredMembers.filter(m => m.role === GuildRole.MEMBER),
    [GuildRole.RECRUIT]: filteredMembers.filter(m => m.role === GuildRole.RECRUIT),
  };

  // 멤버 카드 렌더링
  const renderMemberCard = (member: GuildMember) => (
    <div 
      key={member.userId}
      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            src={member.avatar || '/api/placeholder/40/40'} 
            alt={member.username}
            className="w-10 h-10 rounded-full"
          />
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            member.status.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.username}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
              {member.role}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>LV {member.stats.level}</span>
            <span>기여도 {member.stats.contribution}</span>
            <span>가입일: {new Date(member.joinedAt).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onMessageMember?.(member.userId)}
          icon={<MessageCircle className="w-4 h-4" />}
          className="p-2"
        />
        
        {hasPermission(GuildPermission.MANAGE_GUILD_INFO) && member.userId !== currentMember?.userId && (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMemberOptions(showMemberOptions === member.userId ? null : member.userId)}
              icon={<MoreVertical className="w-4 h-4" />}
              className="p-2"
            />
            
            {showMemberOptions === member.userId && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setShowMemberModal(true);
                    setShowMemberOptions(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  프로필 보기
                </button>
                
                {hasPermission(GuildPermission.PROMOTE_MEMBERS) && (
                  <button
                    onClick={() => {
                      // 승진 로직
                      setShowMemberOptions(null);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    승진시키기
                  </button>
                )}
                
                <hr className="my-1" />
                
                {hasPermission(GuildPermission.KICK_MEMBERS) && (
                  <button
                    onClick={() => {
                      onKickMember?.(member.userId);
                      setShowMemberOptions(null);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    길드에서 내보내기
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 멤버 상세 모달
  const renderMemberModal = () => (
    <Modal
      isOpen={showMemberModal}
      onClose={() => {
        setShowMemberModal(false);
        setSelectedMember(null);
      }}
      title={selectedMember?.username || ''}
    >
      {selectedMember && (
        <div className="space-y-4">
          {/* 멤버 기본 정보 */}
          <div className="flex items-center gap-4">
            <img 
              src={selectedMember.avatar || '/api/placeholder/80/80'}
              alt={selectedMember.username}
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h3 className="text-xl font-bold">{selectedMember.username}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getRoleColor(selectedMember.role)}`}>
                  {selectedMember.role}
                </span>
                <span className="text-sm text-gray-600">레벨 {selectedMember.stats.level}</span>
              </div>
            </div>
          </div>
          
          {/* 활동 통계 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">활동 통계</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">기여도</p>
                <p className="text-lg font-medium">{selectedMember.stats.contribution}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">출석일</p>
                <p className="text-lg font-medium">{selectedMember.stats.attendance}일</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">이벤트 참여</p>
                <p className="text-lg font-medium">{selectedMember.stats.eventsParticipated}회</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">완료 프로젝트</p>
                <p className="text-lg font-medium">{selectedMember.stats.projectsCompleted}개</p>
              </div>
            </div>
          </div>
          
          {/* 업적 */}
          {selectedMember.achievements.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">길드 업적</h4>
              <div className="space-y-2">
                {selectedMember.achievements.map(achievement => (
                  <div key={achievement.id} className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>{achievement.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(achievement.earnedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 권한 */}
          {hasPermission(GuildPermission.MANAGE_ROLES) && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">권한</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMember.permissions.map(permission => (
                  <span key={permission} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => onMessageMember?.(selectedMember.userId)}
              icon={<MessageCircle className="w-4 h-4" />}
            >
              메시지
            </Button>
            {hasPermission(GuildPermission.MANAGE_GUILD_INFO) && selectedMember.userId !== currentMember?.userId && (
              <Button
                variant="secondary"
                onClick={() => {
                  onKickMember?.(selectedMember.userId);
                  setShowMemberModal(false);
                }}
                icon={<LogOut className="w-4 h-4" />}
              >
                내보내기
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 길드 헤더 */}
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-500">
          {guild.banner && (
            <img 
              src={guild.banner} 
              alt={guild.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* 길드 아바타 */}
          <div className="absolute bottom-4 left-4">
            <img 
              src={guild.avatar} 
              alt={guild.name}
              className="w-24 h-24 rounded-lg bg-white border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 길드 상태 */}
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guild.status)}`}>
              {guild.status}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{guild.name}</h1>
              <p className="text-gray-600 mt-1">{guild.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {guild.memberCount}/{guild.maxMembers} 멤버
                </span>
                <span className="flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  {guild.leaderName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  설립: {new Date(guild.foundedAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {hasPermission(GuildPermission.INVITE_MEMBERS) && (
                <Button
                  variant="primary"
                  onClick={onInviteMember}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  멤버 초대
                </Button>
              )}
              {hasPermission(GuildPermission.MANAGE_GUILD_INFO) && (
                <Button
                  variant="secondary"
                  onClick={onManageGuild}
                  icon={<Settings className="w-4 h-4" />}
                >
                  길드 관리
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={onLeaveGuild}
                icon={<LogOut className="w-4 h-4" />}
              >
                길드 탈퇴
              </Button>
            </div>
          </div>
          
          {/* 길드 통계 */}
          <div className="grid grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 text-2xl font-bold text-blue-600">
                <Trophy className="w-6 h-6" />
                {guild.stats.level}
              </div>
              <p className="text-sm text-gray-600">길드 레벨</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 text-2xl font-bold text-green-600">
                <Target className="w-6 h-6" />
                {guild.stats.experience}
              </div>
              <p className="text-sm text-gray-600">경험치</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 text-2xl font-bold text-purple-600">
                <DollarSign className="w-6 h-6" />
                {guild.stats.wealth.vxc}
              </div>
              <p className="text-sm text-gray-600">VXC</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center gap-1 text-2xl font-bold text-orange-600">
                <Star className="w-6 h-6" />
                #{guild.stats.rankings.overall}
              </div>
              <p className="text-sm text-gray-600">전체 순위</p>
            </div>
          </div>
        </div>
      </Card>
      
      {/* 탭 메뉴 */}
      <Card className="p-4">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'members' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              멤버
            </div>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'events' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              이벤트
            </div>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'projects' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              프로젝트
            </div>
          </button>
          <button
            onClick={() => setActiveTab('treasury')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'treasury' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              금고
            </div>
          </button>
        </div>
        
        {/* 탭 콘텐츠 */}
        <div className="mt-4">
          {activeTab === 'members' && (
            <div>
              {/* 멤버 검색 */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="멤버 검색..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {hasPermission(GuildPermission.INVITE_MEMBERS) && (
                  <Button
                    variant="primary"
                    onClick={onInviteMember}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    멤버 초대
                  </Button>
                )}
              </div>
              
              {/* 멤버 목록 */}
              <div className="space-y-4">
                {Object.entries(membersByRole).map(([role, members]) => 
                  members.length > 0 && (
                    <div key={role}>
                      <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                        {role} - {members.length}명
                      </h3>
                      <div className="space-y-2">
                        {members.map(renderMemberCard)}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">길드 이벤트</h3>
                {hasPermission(GuildPermission.CREATE_EVENTS) && (
                  <Button
                    variant="primary"
                    onClick={onCreateEvent}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    이벤트 생성
                  </Button>
                )}
              </div>
              
              {guild.events.length > 0 ? (
                <div className="space-y-3">
                  {guild.events.slice(0, 5).map(event => (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{event.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(event.startTime).toLocaleString('ko-KR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {event.attendees.length} 참석자
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              event.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                              event.status === 'ongoing' ? 'bg-green-50 text-green-700' :
                              event.status === 'completed' ? 'bg-gray-50 text-gray-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ChevronRight className="w-4 h-4" />}
                        >
                          자세히
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>예정된 이벤트가 없습니다</p>
                </div>
              )}
              
              <Button
                variant="secondary"
                onClick={onViewEvents}
                className="mt-4"
                icon={<ChevronRight className="w-4 h-4" />}
              >
                모든 이벤트 보기
              </Button>
            </div>
          )}
          
          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">길드 프로젝트</h3>
                {hasPermission(GuildPermission.START_PROJECTS) && (
                  <Button
                    variant="primary"
                    onClick={onCreateProject}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    프로젝트 생성
                  </Button>
                )}
              </div>
              
              {guild.projects.length > 0 ? (
                <div className="space-y-3">
                  {guild.projects.slice(0, 5).map(project => (
                    <div key={project.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {project.progress.percentage}% 완료
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {project.participants.length} 참여자
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              project.status === 'proposed' ? 'bg-gray-50 text-gray-700' :
                              project.status === 'active' ? 'bg-blue-50 text-blue-700' :
                              project.status === 'completed' ? 'bg-green-50 text-green-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ChevronRight className="w-4 h-4" />}
                        >
                          자세히
                        </Button>
                      </div>
                      <div className="mt-2 bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${project.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>진행 중인 프로젝트가 없습니다</p>
                </div>
              )}
              
              <Button
                variant="secondary"
                onClick={onViewProjects}
                className="mt-4"
                icon={<ChevronRight className="w-4 h-4" />}
              >
                모든 프로젝트 보기
              </Button>
            </div>
          )}
          
          {activeTab === 'treasury' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg">
                  <h4 className="text-sm opacity-80">VXC</h4>
                  <p className="text-2xl font-bold mt-1">{guild.stats.wealth.vxc.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg">
                  <h4 className="text-sm opacity-80">PTX</h4>
                  <p className="text-2xl font-bold mt-1">{guild.stats.wealth.ptx.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg">
                  <h4 className="text-sm opacity-80">NFT</h4>
                  <p className="text-2xl font-bold mt-1">{guild.stats.wealth.nfts}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">최근 거래</h3>
                {hasPermission(GuildPermission.MANAGE_TREASURY) && (
                  <Button
                    variant="secondary"
                    onClick={onViewTreasury}
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    전체 보기
                  </Button>
                )}
              </div>
              
              {/* 거래 내역 (가상 데이터) */}
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        i % 2 === 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <DollarSign className={`w-4 h-4 ${
                          i % 2 === 0 ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {i % 2 === 0 ? '멤버 기부' : '프로젝트 지출'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {i === 1 ? '방금' : `${i}시간 전`}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium ${
                      i % 2 === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {i % 2 === 0 ? '+' : '-'}{(i * 100).toLocaleString()} VXC
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* 멤버 상세 모달 */}
      {renderMemberModal()}
      
      {/* 클릭 외부 영역 감지 */}
      {showMemberOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMemberOptions(null)}
        />
      )}
    </div>
  );
};

export default Guild;