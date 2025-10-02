import { Component } from "@angular/core";
import { NavbarComponent } from "../../sections/navbar/navbar.component";
import { HeroComponent } from "../../sections/hero/hero.component";
import { AboutComponent } from "../../sections/about/about.component";
import { ProjectsComponent } from "../../sections/projects/projects.component";
import { TestimonialsComponent } from "../../sections/testimonials/testimonials.component";
import { ContactComponent } from "../../sections/contact/contact.component";
import { FooterComponent } from "../../sections/footer/footer.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    AboutComponent,
    ProjectsComponent,
    TestimonialsComponent,
    ContactComponent,
    FooterComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {}
