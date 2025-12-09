import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Conversation, Message, User, OnlineUser } from '../../../models';
import { ConversationService } from '../../../services/conversation.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-chat-window',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss'
})
  
export class ChatWindow implements OnInit, OnDestroy, AfterViewChecked {
  @Input() conversation!: Conversation;
  @Input() currentUser: User | null = null;
  @Input() onlineUsers: OnlineUser[] = [];
  @Output() messageSent = new EventEmitter<string>();

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: Message[] = [];
  newMessage = '';
  typingUser: string | null = null;
  isOnline = false;
  private shouldScrollToBottom = true;
  private destroy$ = new Subject<void>();
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private conversationService: ConversationService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadMessages();
    this.setupWebSocketListeners();
    this.checkOnlineStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private loadMessages(): void {
    this.conversationService.getMessages(this.conversation.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      }
    });
  }

  private setupWebSocketListeners(): void {
    this.wsService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (message.conversationId === this.conversation.id) {
          this.messages.push(message);
          this.shouldScrollToBottom = true;
        }
      });

    this.wsService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data.conversationId === this.conversation.id && data.userId !== this.currentUser?.id) {
          this.typingUser = data.isTyping ? data.username : null;
        }
      });

    this.wsService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkOnlineStatus();
      });
  }

  private checkOnlineStatus(): void {
    const otherParticipantId = this.conversation.participantIds.find(
      id => id !== this.currentUser?.id
    );
    this.isOnline = this.onlineUsers.some(u => u.userId === otherParticipantId);
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
      this.shouldScrollToBottom = false;
    } catch (err) {}
  }

  getOtherParticipantName(): string {
    if (this.conversation.name) return this.conversation.name;
    
    const otherParticipant = this.conversation.participants?.find(
      p => p.id !== this.currentUser?.id
    );
    return otherParticipant?.username || 'Usuario';
  }

  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  onTyping(): void {
    this.wsService.sendTyping(this.conversation.id, true);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      this.wsService.sendTyping(this.conversation.id, false);
    }, 2000);
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content) return;

    this.messageSent.emit(content);
    this.newMessage = '';
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.wsService.sendTyping(this.conversation.id, false);
  }
}
