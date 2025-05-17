import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Hammer,
  Plus,
  ChevronRight,
  Calendar,
  Users,
  Target,
  Edit,
  Trash,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Tag,
  BarChart3,
  MessageCircle,
  AlertTriangle,
  Filter,
  MoreVertical
} from 'lucide-react';

// Type imports
import { GuildProject, ProjectStatus, ProjectPriority, ProjectMember } from '../../types/Guild';

// Guild Projects Page Component
const GuildProjects: React.FC = () => {
  // States
  const [activeFilter, setActiveFilter] = useState<'all' | ProjectStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ProjectPriority>('all');
  const [projects, setProjects] = useState<GuildProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<GuildProject | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const projectVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  };

  // Mock data (replace with API calls)
  useEffect(() => {
    fetchGuildProjects();
  }, [activeFilter, priorityFilter]);

  const fetchGuildProjects = async () => {
    // TODO: Replace with actual API calls
    const mockProjects: GuildProject[] = [
      {
        id: 'project_1',
        title: 'Crystal Spire Tower',
        description: 'Construction of a massive crystal spire tower for guild defense and ceremonial purposes',
        status: 'in_progress',
        priority: 'high',
        progress: 75,
        createdBy: {
          id: 'user1',
          username: 'CrystalMaster',
          avatar: '/assets/avatars/crystal_master.png'
        },
        startDate: new Date('2024-01-01'),
        deadline: new Date('2024-03-01'),
        budget: {
          VXC: 50000,
          PTX: 200,
          materials: ['crystal_blocks', 'steel_beams', 'magic_core']
        },
        assignedMembers: [
          {
            id: 'member1',
            username: 'BuilderPro',
            avatar: '/assets/avatars/builder_pro.png',
            role: 'architect',
            contribution: 45,
            color: '#3B82F6'
          },
          {
            id: 'member2',
            username: 'StructureX',
            avatar: '/assets/avatars/structure_x.png',
            role: 'engineer',
            contribution: 30,
            color: '#EF4444'
          }
        ],
        tasks: [
          { id: 'task1', title: 'Foundation', completed: true, assignee: 'member1' },
          { id: 'task2', title: 'Core Structure', completed: true, assignee: 'member1' },
          { id: 'task3', title: 'Crystal Installation', completed: false, assignee: 'member2' },
          { id: 'task4', title: 'Magic Core Integration', completed: false, assignee: 'member2' }
        ],
        location: {
          x: 150,
          y: 64,
          z: 250
        },
        guild: null
      },
      {
        id: 'project_2',
        title: 'Guild Resource Farm',
        description: 'Automated resource farm to increase guild material production',
        status: 'completed',
        priority: 'medium',
        progress: 100,
        createdBy: {
          id: 'user2',
          username: 'ResourceKing',
          avatar: '/assets/avatars/resource_king.png'
        },
        startDate: new Date('2023-12-01'),
        deadline: new Date('2024-01-31'),
        budget: {
          VXC: 25000,
          PTX: 100,
          materials: ['wood', 'stone', 'redstone']
        },
        assignedMembers: [
          {
            id: 'member3',
            username: 'FarmMaster',
            avatar: '/assets/avatars/farm_master.png',
            role: 'technician',
            contribution: 85,
            color: '#22C55E'
          }
        ],
        tasks: [
          { id: 'task5', title: 'Land Preparation', completed: true, assignee: 'member3' },
          { id: 'task6', title: 'Machine Setup', completed: true, assignee: 'member3' },
          { id: 'task7', title: 'Automation System', completed: true, assignee: 'member3' },
          { id: 'task8', title: 'Testing & Optimization', completed: true, assignee: 'member3' }
        ],
        location: {
          x: 500,
          y: 64,
          z: 100
        },
        guild: null
      },
      {
        id: 'project_3',
        title: 'Guild Hall Extension',
        description: 'Expanding the guild hall to accommodate more members and facilities',
        status: 'planning',
        priority: 'low',
        progress: 0,
        createdBy: {
          id: 'user1',
          username: 'CrystalMaster',
          avatar: '/assets/avatars/crystal_master.png'
        },
        startDate: new Date('2024-03-01'),
        deadline: new Date('2024-06-01'),
        budget: {
          VXC: 80000,
          PTX: 350,
          materials: ['oak_planks', 'decorative_blocks', 'glass_panes']
        },
        assignedMembers: [],
        tasks: [
          { id: 'task9', title: 'Design Planning', completed: false, assignee: 'unassigned' },
          { id: 'task10', title: 'Material Collection', completed: false, assignee: 'unassigned' },
          { id: 'task11', title: 'Construction', completed: false, assignee: 'unassigned' },
          { id: 'task12', title: 'Interior Design', completed: false, assignee: 'unassigned' }
        ],
        location: {
          x: 0,
          y: 64,
          z: 0
        },
        guild: null
      }
    ];

    // Apply filters
    let filteredProjects = mockProjects;
    
    if (activeFilter !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === activeFilter);
    }
    
    if (priorityFilter !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.priority === priorityFilter);
    }
    
    if (searchQuery) {
      filteredProjects = filteredProjects.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setProjects(filteredProjects);
  };

  const handleProjectClick = (project: GuildProject) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch(status) {
      case 'planning':
        return <Target className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch(status) {
      case 'planning':
        return 'bg-gray-500/20 text-gray-300';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-300';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300';
    }
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    switch(priority) {
      case 'low':
        return 'text-gray-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
    }
  };

  return (
    <>
      <Head>
        <title>Guild Projects - DIY Crafting World</title>
        <meta name="description" content="Manage and track guild construction projects" />
      </Head>

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
      >
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <Link href="/guild/hub" className="mr-4 p-2 hover:bg-white/10 rounded transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
                </Link>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Hammer className="mr-2" />
                  Guild Projects
                </h1>
              </div>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg flex items-center transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                variants={projectVariants}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleProjectClick(project)}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
              >
                {/* Project Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{project.title}</h3>
                      <p className="text-sm text-gray-400">{project.description}</p>
                    </div>
                    <div className="relative">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs flex items-center ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1">{project.status}</span>
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Progress</span>
                    <span className="text-sm font-medium text-white">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Team & Timeline */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-300">{project.assignedMembers.length} members</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-300">{new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Assigned Members */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {project.assignedMembers.slice(0, 4).map((member) => (
                      <img
                        key={member.id}
                        src={member.avatar}
                        alt={member.username}
                        className="w-8 h-8 rounded-full border-2 border-gray-700 hover:z-10"
                        title={member.username}
                      />
                    ))}
                    {project.assignedMembers.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs text-gray-300">
                        +{project.assignedMembers.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="text-center py-12">
              <Hammer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Projects Found</h3>
              <p className="text-gray-400 mb-6">Start by creating your first guild project</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Project
              </button>
            </div>
          )}
        </div>

        {/* Project Details Modal */}
        {showProjectDetails && selectedProject && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-white/10 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{selectedProject.title}</h2>
                  <button
                    onClick={() => setShowProjectDetails(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-400 rotate-45" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-gray-300">{selectedProject.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Tasks</h3>
                      <div className="space-y-2">
                        {selectedProject.tasks.map((task) => (
                          <div key={task.id} className="flex items-center p-3 bg-white/5 rounded-lg">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              readOnly
                              className="mr-3 w-4 h-4 rounded bg-white/10 border-white/20"
                            />
                            <div className="flex-1">
                              <span className={`text-sm ${task.completed ? 'text-green-300 line-through' : 'text-white'}`}>
                                {task.title}
                              </span>
                              <span className="ml-2 text-xs text-gray-400">
                                {task.assignee === 'unassigned' ? 'Unassigned' : task.assignee}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedProject.status)}`}>
                            {selectedProject.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Priority</span>
                          <span className={`text-xs font-medium ${getPriorityColor(selectedProject.priority)}`}>
                            {selectedProject.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Start Date</span>
                          <span className="text-white">{new Date(selectedProject.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Deadline</span>
                          <span className="text-white">{new Date(selectedProject.deadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{selectedProject.progress}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Budget</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">VXC Required</span>
                          <span className="text-white">{selectedProject.budget.VXC.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">PTX Required</span>
                          <span className="text-white">{selectedProject.budget.PTX.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Materials</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedProject.budget.materials.map((material, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                {material}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Team</h3>
                      <div className="space-y-2">
                        {selectedProject.assignedMembers.map((member) => (
                          <div key={member.id} className="flex items-center p-2 bg-white/5 rounded-lg">
                            <img
                              src={member.avatar}
                              alt={member.username}
                              className="w-8 h-8 rounded-full mr-3"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-white">{member.username}</div>
                              <div className="text-xs text-gray-400">{member.role}</div>
                            </div>
                            <div className="text-sm text-gray-300">
                              {member.contribution}% contribution
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 flex justify-end space-x-4">
                <button
                  onClick={() => setShowProjectDetails(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Edit Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-white/10 rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-400 rotate-45" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Enter project title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Describe your project"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                      <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Deadline</label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Budget</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="number"
                          placeholder="VXC Amount"
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="PTX Amount"
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              
              <div className="p-6 border-t border-white/10 flex justify-end space-x-4">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Handle project creation
                    setShowNewProjectModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default GuildProjects;
