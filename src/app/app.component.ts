import {Component} from '@angular/core';
import {NavbarComponent} from './sections/navbar/navbar.component';
import {HeroComponent} from './sections/hero/hero.component';
import {AboutComponent} from "./sections/about/about.component";
import {ProjectsComponent} from "./sections/projects/projects.component";
import {TestimonialsComponent} from "./sections/testimonials/testimonials.component";
import {ContactComponent} from "./sections/contact/contact.component";
import {FooterComponent} from "./sections/footer/footer.component";

@Component({
    selector: 'app-root',
    imports: [NavbarComponent, HeroComponent, AboutComponent, ProjectsComponent, TestimonialsComponent, ContactComponent, FooterComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
    title = 'treejs-portfolio';
}
