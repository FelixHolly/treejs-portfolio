import { Component, OnInit } from '@angular/core';
import {ButtonComponent} from '../../components/button/button.component';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  imports: [
    ButtonComponent
  ]
})
export class HeroComponent implements OnInit {
  isSmall = false;
  isMobile = false;
  isTablet = false;
  sizes: any = {};

  ngOnInit(): void {
    this.isSmall = window.matchMedia('(max-width: 440px)').matches;
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
    this.isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;

    this.sizes = calculateSizes(this.isSmall, this.isMobile, this.isTablet);
  }
}

function calculateSizes(isSmall: boolean, isMobile: boolean, isTablet: boolean) {
  return {
    deskScale: isSmall ? 0.05 : isMobile ? 0.06 : 0.065,
    deskPosition: isMobile ? [0.5, -4.5, 0] : [0.25, -5.5, 0],
    cubePosition: isSmall ? [4, -5, 0] : isMobile ? [5, -5, 0] : isTablet ? [5, -5, 0] : [9, -5.5, 0],
    reactLogoPosition: isSmall ? [3, 4, 0] : isMobile ? [5, 4, 0] : isTablet ? [5, 4, 0] : [12, 3, 0],
    ringPosition: isSmall ? [-5, 7, 0] : isMobile ? [-10, 10, 0] : isTablet ? [-12, 10, 0] : [-24, 10, 0],
    targetPosition: isSmall ? [-5, -10, -10] : isMobile ? [-9, -10, -10] : isTablet ? [-11, -7, -10] : [-13, -13, -10],
  };
}
