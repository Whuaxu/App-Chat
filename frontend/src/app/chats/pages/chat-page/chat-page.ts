// chat-whatsapp.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

interface Contact {
  id: number;
  name: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

interface Message {
  id: number;
  fromMe: boolean;
  text: string;
  time: string;
}

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.html',
  styleUrls: ['./chat-page.scss']
})
export default class ChatPage implements OnInit {
  contacts: Contact[] = [];
  activeContact: Contact | null = null;
  messages: Message[] = [];
  newMessage = '';

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  ngOnInit() {
    this.loadMockData();
  }

  loadMockData() {
    this.contacts = [
      { id: 1, name: 'María', lastMessage: '¿Llegas ya?', lastTime: '09:15', unread: 2 },
      { id: 2, name: 'Carlos', lastMessage: 'Perfecto 👍', lastTime: 'Ayer' },
      { id: 3, name: 'Equipo Dev', lastMessage: 'Revisión lista', lastTime: 'lun' }
    ];

    this.selectContact(this.contacts[0]);
  }

  selectContact(contact: Contact) {
    this.activeContact = contact;
    // mock messages
    this.messages = [
      { id: 1, fromMe: false, text: 'Hola! Cómo vas?', time: '09:00'},
      { id: 2, fromMe: true, text: 'Todo bien, trabajando en el ticket.', time: '09:03'},
      { id: 3, fromMe: false, text: 'Perfecto. Nos vemos a las 11.', time: '09:10'}
    ];
    setTimeout(() => this.scrollToBottom(), 0);
  }

  sendMessage() {
    const text = this.newMessage && this.newMessage.trim();
    if (!text) return;
    const msg: Message = {
      id: Date.now(),
      fromMe: true,
      text,
      time: this.nowTime(),
    };
    this.messages.push(msg);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 0);
  }

  nowTime() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  scrollToBottom() {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (e) { /* ignore */ }
  }

  onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
