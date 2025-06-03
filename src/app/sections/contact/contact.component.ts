import {Component, ElementRef, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  @ViewChild('contactForm', { static: false }) formRef!: ElementRef<HTMLFormElement>;

  form = {
    name: '',
    email: '',
    message: ''
  };

  alert = {
    show: false,
    text: '',
    type: '' // 'success' or 'danger'
  };

  loading = false;

  handleSubmit() {
    this.loading = true;

  }

  showAlert(text: string, type: string) {
    this.alert = { show: true, text, type };
    setTimeout(() => {
      this.alert.show = false;
    }, 3000);
  }
}
