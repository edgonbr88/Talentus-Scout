import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scout-terms-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scout-terms-modal.component.html',
  styleUrl: './scout-terms-modal.component.css'
})
export class ScoutTermsModalComponent {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() acceptTerms = new EventEmitter<void>();

  onClose(): void {
    this.closeModal.emit();
  }

  onAccept(): void {
    this.acceptTerms.emit();
  }
}
