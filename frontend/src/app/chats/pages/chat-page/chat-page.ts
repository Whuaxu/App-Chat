// chat-whatsapp.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConversationService } from '../../services/conversation.service';
import { UserService } from '../../services/user.service';
import { WebSocketService } from '../../services/websocket.service';
import { User, Conversation, OnlineUser } from '../../models';
import { ConversationList } from './conversation-list/conversation-list';
import { ChatWindow } from './chat-window/chat-window';
import { NewChat } from './new-chat/new-chat';


@Component({
  selector: 'app-chat',
  templateUrl: './chat-page.html',
  imports: [CommonModule, ConversationList, ChatWindow, NewChat],
  styleUrls: ['./chat-page.scss']
})
export default class ChatPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  availableUsers: User[] = [];
  onlineUsers: OnlineUser[] = [];
  showNewChatModal = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private conversationService: ConversationService,
    private userService: UserService,
    private wsService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadConversations();
    this.loadUsers();
    this.setupWebSocket();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.selectedConversation) {
      this.wsService.leaveConversation(this.selectedConversation.id);
    }
    this.wsService.disconnect();
  }

  private handleRouteParams(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const userId = params['userId'];
      const conversationId = params['conversationId'];

      if (userId) {
        // Navigate to chat with a specific user - create or get conversation
        this.openConversationWithUser(userId);
      } else if (conversationId) {
        // Navigate to a specific conversation
        this.openConversationById(conversationId);
      }
    });
  }

  private openConversationWithUser(userId: string): void {
    // createConversation now returns the full conversation with participants
    this.conversationService.createConversation(userId).subscribe({
      next: (conversation) => {
        // Add to conversations list if not exists
        const existingIndex = this.conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex === -1) {
          this.conversations.unshift(conversation);
        } else {
          this.conversations[existingIndex] = conversation;
        }
        this.selectConversation(conversation);
      },
      error: (error) => {
        console.error('Error creating/getting conversation:', error);
      }
    });
  }

  private openConversationById(conversationId: string): void {
    this.conversationService.getConversation(conversationId).subscribe({
      next: (conversation) => {
        // Add to conversations list if not exists
        const existingIndex = this.conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex === -1) {
          this.conversations.unshift(conversation);
        } else {
          this.conversations[existingIndex] = conversation;
        }
        this.selectConversation(conversation);
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
        // Redirect to base chat if conversation not found
        this.router.navigate(['/chat']);
      }
    });
  }

  private selectConversation(conversation: Conversation): void {
    if (this.selectedConversation) {
      this.wsService.leaveConversation(this.selectedConversation.id);
    }
    this.selectedConversation = conversation;
    this.wsService.joinConversation(conversation.id);
  }

  private setupWebSocket(): void {
    this.wsService.connect();
    
    this.wsService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.onlineUsers = users;
      });

    this.wsService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        // Update conversation list with new message
        const convIndex = this.conversations.findIndex(c => c.id === message.conversationId);
        if (convIndex > -1) {
          this.conversations[convIndex].lastMessage = message;
          this.conversations[convIndex].updatedAt = message.createdAt;
          // Move to top
          const conv = this.conversations.splice(convIndex, 1)[0];
          this.conversations.unshift(conv);
        }
      });

    this.wsService.messageNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationId, message }) => {
        // Update conversation in list if not currently viewing it
        const convIndex = this.conversations.findIndex(c => c.id === conversationId);
        if (convIndex > -1) {
          this.conversations[convIndex].lastMessage = message;
          this.conversations[convIndex].updatedAt = message.createdAt;
        }
      });
  }

  private loadUsers(): void {
    
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          
          this.availableUsers = users.filter(u => u.id !== this.currentUser?.id);
        },
        error: (error) => {
          console.error('❌ Error loading users:', error);
        }
      });
  }

  private loadConversations(): void {
    
    this.conversationService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          
          this.conversations = conversations;
        },
        error: (error) => {
          console.error('❌ Error loading conversations:', error);
        }
      });
  }

  onConversationSelected(conversation: Conversation): void {
    // Navigate to the conversation URL
    this.router.navigate(['/chat/conversation', conversation.id]);
  }

  onMessageSent(content: string): void {
    if (!this.selectedConversation) return;
    
    this.conversationService.sendMessage(this.selectedConversation.id, content).subscribe({
      next: (message) => {
        // Message will be received via WebSocket
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  startNewChat(user: User): void {
    this.showNewChatModal = false;
    // Navigate to user chat URL which will create/get the conversation
    this.router.navigate(['/chat/user', user.id]);
  }

  getUserInitial(): string {
    return this.currentUser?.username?.charAt(0).toUpperCase() || '?';
  }

  logout(): void {
    this.wsService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}