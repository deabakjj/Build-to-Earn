import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatRoom, 
  ChatMessage, 
  ChatAttachment, 
  ChatReaction, 
  TypingIndicator,
  Poll
} from '../../types/Social';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image, 
  MoreVertical, 
  Reply, 
  Edit2, 
  Trash2, 
  Pin, 
  Copy,
  ThumbsUp,
  Heart,
  Laugh,
  Angry,
  Sad,
  Wow,
  Search,
  Phone,
  Video,
  Info,
  Plus,
  Mic,
  MicOff
} from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';

interface ChatProps {
  chatRoom: ChatRoom;
  messages: ChatMessage[];
  currentUserId: string;
  typingUsers?: TypingIndicator[];
  onSendMessage?: (content: string, type?: 'text' | 'image' | 'attachment', attachments?: ChatAttachment[]) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onReplyToMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUploadFile?: (file: File) => Promise<string>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onViewMembers?: () => void;
  onSearchMessages?: (query: string) => void;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({
  chatRoom,
  messages,
  currentUserId,
  typingUsers = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onReplyToMessage,
  onPinMessage,
  onUploadFile,
  onStartTyping,
  onStopTyping,
  onVoiceCall,
  onVideoCall,
  onViewMembers,
  onSearchMessages,
  className = ''
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 타이핑 상태 관리
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (messageInput && onStartTyping) {
      onStartTyping();
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 1000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageInput]);

  // 이모지 목록
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😠', '🎉', '🔥', '👏', '💯'];
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😠'];

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!messageInput.trim() && !replyingTo) return;
    
    let messageContent = messageInput.trim();
    let messageType: 'text' | 'image' | 'attachment' = 'text';
    
    // 답장 처리
    if (replyingTo) {
      messageContent = `[답장: ${replyingTo.senderUsername}] ${messageContent}`;
    }
    
    onSendMessage?.(messageContent, messageType);
    setMessageInput('');
    setReplyingTo(null);
    messageInputRef.current?.focus();
  };

  // 파일 업로드 처리
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    
    try {
      const url = await onUploadFile(file);
      
      // 파일 타입에 따라 메시지 타입 결정
      const isImage = file.type.startsWith('image/');
      const attachment: ChatAttachment = {
        id: Date.now().toString(),
        type: isImage ? 'image' : 'file',
        url,
        filename: file.name,
        size: file.size,
        mimeType: file.type
      };
      
      onSendMessage?.(isImage ? '' : file.name, isImage ? 'image' : 'attachment', [attachment]);
    } catch (error) {
      console.error('File upload failed:', error);
    }
    
    e.target.value = '';
  };

  // 메시지 렌더링
  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.senderId === currentUserId;
    const isSystemMessage = message.type === 'system';

    if (isSystemMessage) {
      return (
        <div key={message.id} className="text-center text-sm text-gray-500 my-2">
          {message.content}
        </div>
      );
    }

    return (
      <div 
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : ''}`}>
          {/* 답장 표시 */}
          {message.replyTo && (
            <div className="text-xs text-gray-500 mb-1 pl-3 border-l-2 border-gray-300">
              답장: {message.replyTo.content}
            </div>
          )}
          
          {/* 메시지 내용 */}
          <div className={`relative rounded-lg p-3 ${
            isOwnMessage 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            {/* 메시지 메뉴 */}
            <button
              onClick={() => setSelectedMessage(selectedMessage?.id === message.id ? null : message)}
              className="absolute top-1 right-1 p-1 opacity-0 hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {/* 아바타 및 이름 */}
            {!isOwnMessage && (
              <div className="flex items-center gap-2 mb-1">
                <img 
                  src={message.senderAvatar || '/api/placeholder/24/24'} 
                  alt={message.senderUsername}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs font-medium">{message.senderUsername}</span>
              </div>
            )}
            
            {/* 메시지 내용 */}
            {message.type === 'text' && <p>{message.content}</p>}
            
            {/* 이미지 첨부 */}
            {message.type === 'image' && message.attachments?.map(attachment => (
              <div key={attachment.id} className="mt-2">
                <img 
                  src={attachment.url} 
                  alt={attachment.filename}
                  className="max-w-full rounded cursor-pointer"
                  onClick={() => window.open(attachment.url, '_blank')}
                />
              </div>
            ))}
            
            {/* 파일 첨부 */}
            {message.type === 'attachment' && message.attachments?.map(attachment => (
              <div key={attachment.id} className="mt-2 p-2 bg-white/20 rounded flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <a 
                  href={attachment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  {attachment.filename}
                </a>
              </div>
            ))}
            
            {/* 시간 표시 */}
            <div className="text-xs mt-1 opacity-70 flex justify-end gap-2">
              {message.isEdited && <span>수정됨</span>}
              <span>{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          {/* 리액션 */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map(reaction => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReactToMessage?.(message.id, reaction.emoji)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs flex items-center gap-1"
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 메시지 메뉴 */}
        {selectedMessage?.id === message.id && (
          <div className="absolute bg-white rounded-lg shadow-lg border py-1 z-10">
            <button
              onClick={() => {
                onReplyToMessage?.(message.id);
                setReplyingTo(message);
                setSelectedMessage(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <Reply className="w-4 h-4" />
              답장
            </button>
            {reactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReactToMessage?.(message.id, emoji);
                  setSelectedMessage(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <span>{emoji}</span>
                {emoji === '👍' && '좋아요'}
                {emoji === '❤️' && '하트'}
                {emoji === '😂' && '웃음'}
                {emoji === '😮' && '놀람'}
                {emoji === '😢' && '슬픔'}
                {emoji === '😠' && '화남'}
              </button>
            ))}
            <hr className="my-1" />
            <button
              onClick={() => {
                onPinMessage?.(message.id);
                setSelectedMessage(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <Pin className="w-4 h-4" />
              핀 고정
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setSelectedMessage(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              복사
            </button>
            {isOwnMessage && (
              <>
                <button
                  onClick={() => {
                    setEditingMessage(message);
                    setMessageInput(message.content);
                    setSelectedMessage(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  수정
                </button>
                <button
                  onClick={() => {
                    onDeleteMessage?.(message.id);
                    setSelectedMessage(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // 타이핑 인디케이터 렌더링
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingNames = typingUsers.map(user => user.username).join(', ');
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[70%]">
          <div className="bg-gray-100 rounded-lg p-3 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <span>{typingNames}</span>
              <span>{typingUsers.length > 1 ? '이' : '가'} 입력 중입니다...</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 채팅방 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {chatRoom.metadata?.avatar && (
            <img 
              src={chatRoom.metadata.avatar} 
              alt={chatRoom.name || '채팅방'}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h2 className="font-medium">{chatRoom.name || '채팅방'}</h2>
            <p className="text-sm text-gray-500">
              {chatRoom.type === 'private' ? '개인 채팅' : `${chatRoom.participants.length}명 참여`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSearchResults(!showSearchResults)}
            icon={<Search className="w-4 h-4" />}
            className="p-2"
          />
          {chatRoom.type === 'private' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onVoiceCall}
                icon={<Phone className="w-4 h-4" />}
                className="p-2"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={onVideoCall}
                icon={<Video className="w-4 h-4" />}
                className="p-2"
              />
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onViewMembers}
            icon={<Info className="w-4 h-4" />}
            className="p-2"
          />
        </div>
      </div>
      
      {/* 검색 결과 */}
      {showSearchResults && (
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="메시지 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchMessages?.(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
      
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map(renderMessage)}
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 답장 표시 */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
          <div className="text-sm">
            <span className="text-blue-600">답장: {replyingTo.senderUsername}</span>
            <span className="text-gray-600 ml-2">{replyingTo.content}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 입력 영역 */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          {/* 파일 첨부 버튼 */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              icon={<Plus className="w-4 h-4" />}
              className="p-2"
            />
            
            {showAttachMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border py-1 z-10">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  파일 첨부
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  이미지 업로드
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,application/*"
            />
          </div>
          
          {/* 메시지 입력 */}
          <input
            ref={messageInputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={editingMessage ? "메시지 수정..." : "메시지를 입력하세요..."}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* 이모지 버튼 */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              icon={<Smile className="w-4 h-4" />}
              className="p-2"
            />
            
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border p-2 grid grid-cols-5 gap-1 z-10">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setMessageInput(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 hover:bg-gray-100 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* 음성 녹음 버튼 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsVoiceRecording(!isVoiceRecording)}
            icon={isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            className={`p-2 ${isVoiceRecording ? 'bg-red-500 text-white' : ''}`}
          />
          
          {/* 전송 버튼 */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            icon={<Send className="w-4 h-4" />}
            className="p-2"
            disabled={!messageInput.trim() && !editingMessage}
          />
        </div>
      </div>
      
      {/* 클릭 외부 영역 감지 */}
      {(selectedMessage || showAttachMenu || showEmojiPicker) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setSelectedMessage(null);
            setShowAttachMenu(false);
            setShowEmojiPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default Chat;