import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import config from '../config';
import logger from '../utils/logger';
import { verifyJwtToken } from '../services/authService';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

class SocketServer {
  private io: Server;
  private activeConnections: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
      path: '/socket.io',
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('WebSocket server initialized');
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token is missing'));
        }

        const decodedToken = await verifyJwtToken(token);
        
        if (!decodedToken) {
          return next(new Error('Invalid authentication token'));
        }

        // Extend the socket with user information
        (socket as AuthenticatedSocket).userId = decodedToken.userId;
        (socket as AuthenticatedSocket).username = decodedToken.username;

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);

      // World events
      socket.on('join-world', (worldId: string) => this.handleJoinWorld(socket, worldId));
      socket.on('leave-world', (worldId: string) => this.handleLeaveWorld(socket, worldId));
      socket.on('update-block', (data: any) => this.handleUpdateBlock(socket, data));
      
      // Chat events
      socket.on('join-chat', (chatId: string) => this.handleJoinChat(socket, chatId));
      socket.on('leave-chat', (chatId: string) => this.handleLeaveChat(socket, chatId));
      socket.on('send-message', (data: any) => this.handleSendMessage(socket, data));
      
      // Guild events
      socket.on('join-guild', (guildId: string) => this.handleJoinGuild(socket, guildId));
      socket.on('leave-guild', (guildId: string) => this.handleLeaveGuild(socket, guildId));
      socket.on('guild-activity', (data: any) => this.handleGuildActivity(socket, data));
      
      // Marketplace events
      socket.on('watch-asset', (assetId: string) => this.handleWatchAsset(socket, assetId));
      socket.on('unwatch-asset', (assetId: string) => this.handleUnwatchAsset(socket, assetId));
      
      // Disconnect handler
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // Connection handlers
  private handleConnection(socket: AuthenticatedSocket) {
    const { userId, username } = socket;
    
    logger.info(`User connected: ${username} (${userId}), socketId: ${socket.id}`);
    
    // Store connection in active connections map
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, []);
    }
    
    this.activeConnections.get(userId)?.push(socket.id);
    
    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);
    
    // Send welcome message
    socket.emit('welcome', {
      message: `Welcome ${username}!`,
      userId: userId
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    const { userId, username } = socket;
    
    logger.info(`User disconnected: ${username} (${userId}), socketId: ${socket.id}`);
    
    // Remove from active connections
    const userSockets = this.activeConnections.get(userId) || [];
    const updatedSockets = userSockets.filter(id => id !== socket.id);
    
    if (updatedSockets.length === 0) {
      this.activeConnections.delete(userId);
    } else {
      this.activeConnections.set(userId, updatedSockets);
    }
  }

  // World event handlers
  private handleJoinWorld(socket: AuthenticatedSocket, worldId: string) {
    logger.debug(`User ${socket.username} joining world: ${worldId}`);
    socket.join(`world:${worldId}`);
    
    // Notify others in the world
    socket.to(`world:${worldId}`).emit('user-joined', {
      userId: socket.userId,
      username: socket.username
    });
  }

  private handleLeaveWorld(socket: AuthenticatedSocket, worldId: string) {
    logger.debug(`User ${socket.username} leaving world: ${worldId}`);
    socket.leave(`world:${worldId}`);
    
    // Notify others in the world
    socket.to(`world:${worldId}`).emit('user-left', {
      userId: socket.userId,
      username: socket.username
    });
  }

  private handleUpdateBlock(socket: AuthenticatedSocket, data: any) {
    const { worldId, position, blockType } = data;
    
    // Validate data
    if (!worldId || !position || !blockType) {
      socket.emit('error', { message: 'Invalid block update data' });
      return;
    }
    
    logger.debug(`User ${socket.username} updated block in world ${worldId}`, data);
    
    // Broadcast the update to all users in the world
    this.io.to(`world:${worldId}`).emit('block-updated', {
      userId: socket.userId,
      username: socket.username,
      position,
      blockType,
      timestamp: Date.now()
    });
  }

  // Chat event handlers
  private handleJoinChat(socket: AuthenticatedSocket, chatId: string) {
    logger.debug(`User ${socket.username} joining chat: ${chatId}`);
    socket.join(`chat:${chatId}`);
  }

  private handleLeaveChat(socket: AuthenticatedSocket, chatId: string) {
    logger.debug(`User ${socket.username} leaving chat: ${chatId}`);
    socket.leave(`chat:${chatId}`);
  }

  private handleSendMessage(socket: AuthenticatedSocket, data: any) {
    const { chatId, message } = data;
    
    // Validate data
    if (!chatId || !message) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }
    
    logger.debug(`User ${socket.username} sent message to chat ${chatId}`);
    
    // Broadcast the message to all users in the chat
    this.io.to(`chat:${chatId}`).emit('new-message', {
      userId: socket.userId,
      username: socket.username,
      message,
      timestamp: Date.now()
    });
  }

  // Guild event handlers
  private handleJoinGuild(socket: AuthenticatedSocket, guildId: string) {
    logger.debug(`User ${socket.username} joining guild: ${guildId}`);
    socket.join(`guild:${guildId}`);
  }

  private handleLeaveGuild(socket: AuthenticatedSocket, guildId: string) {
    logger.debug(`User ${socket.username} leaving guild: ${guildId}`);
    socket.leave(`guild:${guildId}`);
  }

  private handleGuildActivity(socket: AuthenticatedSocket, data: any) {
    const { guildId, activity } = data;
    
    // Validate data
    if (!guildId || !activity) {
      socket.emit('error', { message: 'Invalid guild activity data' });
      return;
    }
    
    logger.debug(`Guild activity in guild ${guildId}`, activity);
    
    // Broadcast the activity to all guild members
    this.io.to(`guild:${guildId}`).emit('guild-activity-update', {
      userId: socket.userId,
      username: socket.username,
      activity,
      timestamp: Date.now()
    });
  }

  // Marketplace event handlers
  private handleWatchAsset(socket: AuthenticatedSocket, assetId: string) {
    logger.debug(`User ${socket.username} watching asset: ${assetId}`);
    socket.join(`asset:${assetId}`);
  }

  private handleUnwatchAsset(socket: AuthenticatedSocket, assetId: string) {
    logger.debug(`User ${socket.username} unwatching asset: ${assetId}`);
    socket.leave(`asset:${assetId}`);
  }

  // Public methods for external use
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToWorld(worldId: string, event: string, data: any) {
    this.io.to(`world:${worldId}`).emit(event, data);
  }

  public emitToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  public emitToGuild(guildId: string, event: string, data: any) {
    this.io.to(`guild:${guildId}`).emit(event, data);
  }

  public emitToAssetWatchers(assetId: string, event: string, data: any) {
    this.io.to(`asset:${assetId}`).emit(event, data);
  }

  public broadcastAssetUpdate(assetId: string, updateData: any) {
    this.io.to(`asset:${assetId}`).emit('asset-updated', {
      assetId,
      ...updateData,
      timestamp: Date.now()
    });
  }

  public broadcastNewListing(assetData: any) {
    this.io.emit('new-listing', {
      ...assetData,
      timestamp: Date.now()
    });
  }

  public broadcastAssetSold(assetId: string, saleData: any) {
    this.io.to(`asset:${assetId}`).emit('asset-sold', {
      assetId,
      ...saleData,
      timestamp: Date.now()
    });
    
    // Also notify all users about high-value sales
    if (saleData.price && saleData.price >= 1000) {
      this.io.emit('high-value-sale', {
        assetId,
        ...saleData,
        timestamp: Date.now()
      });
    }
  }

  public getActiveUsersCount(): number {
    return this.activeConnections.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.activeConnections.has(userId) && 
           (this.activeConnections.get(userId)?.length || 0) > 0;
  }
}

export default SocketServer;
