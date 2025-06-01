import { Component } from '@angular/core';
import {NavItemsComponent} from './nav-items/nav-items.component';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [
    NavItemsComponent,
    NgIf,
    NgClass
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  isOpen = false;

}
