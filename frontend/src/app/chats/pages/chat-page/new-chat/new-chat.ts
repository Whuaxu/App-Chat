import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of } from 'rxjs';
import { User } from '../../../models';
import { UserService } from '../../../services/user.service';


@Component({
  selector: 'app-new-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './new-chat.html',
  styleUrl: './new-chat.scss'
})
export class NewChat { 
  @Input() users: User[] = [];
  @Input() currentUserId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() userSelected = new EventEmitter<User>();

  searchQuery = '';
  filteredUsers: User[] = [];
  isSearching = false;
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length === 0) {
          this.isSearching = false;
          return of([]);
        }
        this.isSearching = true;
        return this.userService.searchUsers(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.filteredUsers = users.filter(u => u.id !== this.currentUserId);
      this.isSearching = false;
    });
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectUser(user: User): void {
    this.userSelected.emit(user);
  }
}
