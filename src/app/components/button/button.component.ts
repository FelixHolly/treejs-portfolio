import { Component, Input } from '@angular/core';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  imports: [
    NgClass,
    NgIf
  ]
})
export class ButtonComponent {
  @Input() name = 'Click Me';
  @Input() isBeam = false;
  @Input() containerClass = '';
}
