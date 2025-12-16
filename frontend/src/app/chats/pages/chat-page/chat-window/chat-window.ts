import { Component, input, output, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, Message, User } from '../../../models';
import { ConversationService } from '../../../services/conversation.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-chat-window',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss'
})
  
export class ChatWindow implements OnInit, OnDestroy, AfterViewChecked {
  conversation = input.required<Conversation>();
  currentUser = input<User | null>(null);
  
  // Signal output
  messageSent = output<string>();

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // Signals for reactive state
  readonly messages = signal<Message[]>([]);
  readonly newMessage = signal('');
  readonly typingUser = signal<string | null>(null);
  private previousConversationId = signal<string | null>(null);
  
  // Computed signals
  readonly isOnline = computed(() => {
    const otherParticipantId = this.conversation().participantIds.find(
      id => id !== this.currentUser()?.id
    );
    return this.wsService.onlineUsers().some(u => u.userId === otherParticipantId);
  });
  
  readonly otherParticipantName = computed(() => {
    const conv = this.conversation();
    if (conv.name) return conv.name;
    
    const otherParticipant = conv.participants?.find(
      p => p.id !== this.currentUser()?.id
    );
    return otherParticipant?.username || 'Usuario';
  });
  
  private shouldScrollToBottom = true;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private conversationService: ConversationService,
    private wsService: WebSocketService
  ) {

    effect(() => {
      const conv = this.conversation();
      
      if (conv && conv.id !== this.previousConversationId()) {
        this.previousConversationId.set(conv.id);
        this.loadMessages();
        this.scrollToBottom();
        this.wsService.newMessage.set(null)
      } 

      setTimeout(() => this.scrollToBottom(), 30);
    }); 


    // Effect to handle new messages - only for current conversation
    effect(() => {
      const message = this.wsService.newMessage();
      
      if (!message) {
        console.log('⚠️ [Effect] Mensaje es null, saltando');
        return;
      }
      
      const currentConvId = this.conversation().id;
      
      if (message.conversationId === currentConvId) {
        
        this.messages.update(msgs => [...msgs, message]);
        this.shouldScrollToBottom = true;
        console.log('✅ [Effect] Mensaje añadido. Total mensajes:', this.messages().length);
        
      } else {
        console.log('❌ [Effect] Mensaje NO coincide con conversación actual');
      }

      setTimeout(() => this.scrollToBottom(), 30);
      
    });

    // Effect to handle typing events - only for current conversation
    effect(() => {
      const typingData = this.wsService.typing();
      const currentConvId = this.conversation().id;
      const currentUserId = this.currentUser()?.id;
      
      if (typingData && typingData.conversationId === currentConvId && 
          typingData.userId !== currentUserId) {
        this.typingUser.set(typingData.isTyping ? typingData.username : null);
      }
    });
  }

  ngOnInit(): void {
    
  }

  ngOnDestroy(): void {
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
    this.conversationService.getMessages(this.conversation().id).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
      this.shouldScrollToBottom = false;
    } catch (err) {}
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date; 
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  onTyping(): void {
    this.wsService.sendTyping(this.conversation().id, true);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      this.wsService.sendTyping(this.conversation().id, false);
    }, 2000);
  }

  sendMessage(): void {
    const content = this.newMessage().trim();
    
    if (!content) {
      console.log('⚠️ [sendMessage] Contenido vacío, cancelando');
      return;
    }

    console.log('📤 [sendMessage] Enviando a conversación:', this.conversation().id);

    // Envía el mensaje via HTTP - el backend lo guardará y hará broadcast via WebSocket
    this.conversationService.sendMessage(this.conversation().id, content).subscribe({
      next: (savedMessage) => {
        console.log('✅ Mensaje enviado y guardado:', savedMessage);
        // El mensaje llegará automáticamente via WebSocket al effect
      },
      error: (error) => {
        console.error('❌ Error enviando mensaje:', error);
      }
    });

    // Limpia el input
    this.newMessage.set('');
  }
}
