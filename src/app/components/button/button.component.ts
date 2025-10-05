import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  imports: [NgClass],
  standalone: true,
})
export class ButtonComponent {
  @Input() name = 'Click Me';
  @Input() isBeam = false;
  @Input() containerClass = '';
  @Input() navigate = '';

  handleClick(): void {
    if (this.navigate) {
      const el = document.querySelector(this.navigate);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
