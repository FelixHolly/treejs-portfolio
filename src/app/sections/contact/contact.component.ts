import { Component, signal } from '@angular/core';
import emailjs from '@emailjs/browser';
import {FormsModule} from "@angular/forms";
import {NgClass, NgIf} from "@angular/common";

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [
    FormsModule,
    NgClass,
    NgIf
  ]
})
export class ContactComponent {
  form = {
    name: '',
    email: '',
    message: '',
  };

  loading = signal(false);
  alert = signal({ show: false, text: '', type: 'success' });

  handleSubmit(): void {
    this.loading.set(true);

    emailjs
        .send(
            'service_cvyf4pk',
            'template_1cbxfpl',
            {
              from_name: this.form.name,
              to_name: 'Your Name',
              from_email: this.form.email,
              to_email: 'your@email.com',
              message: this.form.message,
            },
            'uxjMVOPJ12-pBwK7L'
        )
        .then(
            () => {
              this.loading.set(false);
              this.alert.set({ show: true, text: 'Thank you for your message 😃', type: 'success' });

              setTimeout(() => {
                this.alert.set({ show: false, text: '', type: 'success' });
                this.form = { name: '', email: '', message: '' };
              }, 3000);
            },
            (error) => {
              console.error(error);
              this.loading.set(false);
              this.alert.set({ show: true, text: "I didn't receive your message 😢", type: 'danger' });
            }
        );
  }
}
