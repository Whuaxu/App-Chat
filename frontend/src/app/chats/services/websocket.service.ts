import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Message, OnlineUser } from '../models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  
  private onlineUsersSubject = new BehaviorSubject<OnlineUser[]>([]);
  private newMessageSubject = new Subject<Message>();
  private messageNotificationSubject = new Subject<{conversationId: string; message: Message}>();
  private typingSubject = new Subject<{userId: string; username: string; conversationId: string; isTyping: boolean}>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  onlineUsers$ = this.onlineUsersSubject.asObservable();
  newMessage$ = this.newMessageSubject.asObservable();
  messageNotification$ = this.messageNotificationSubject.asObservable();
  typing$ = this.typingSubject.asObservable();
  connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('online-users', (users: OnlineUser[]) => {
      this.onlineUsersSubject.next(users);
    });

    this.socket.on('user-online', (user: OnlineUser) => {
      const current = this.onlineUsersSubject.value;
      if (!current.find(u => u.userId === user.userId)) {
        this.onlineUsersSubject.next([...current, user]);
      }
    });

    this.socket.on('user-offline', (user: OnlineUser) => {
      const current = this.onlineUsersSubject.value;
      this.onlineUsersSubject.next(current.filter(u => u.userId !== user.userId));
    });

    this.socket.on('new-message', (message: Message) => {
      this.newMessageSubject.next(message);
    });

    this.socket.on('message-notification', (data: {conversationId: string; message: Message}) => {
      this.messageNotificationSubject.next(data);
    });

    this.socket.on('user-typing', (data: {userId: string; username: string; conversationId: string; isTyping: boolean}) => {
      this.typingSubject.next(data);
    });

    this.socket.on('error', (error: {message: string}) => {
      console.error('WebSocket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave-conversation', conversationId);
  }

  sendMessage(conversationId: string, content: string): void {
    this.socket?.emit('send-message', { conversationId, content });
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  markMessageAsRead(messageId: string, conversationId: string): void {
    this.socket?.emit('message-read', { messageId, conversationId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
